import { NextRequest, NextResponse } from "next/server";
import { enforceRaffleGateApi } from "@/lib/auth/gate-api";
import {
  checkGateRateLimit,
  clearGateRateLimit,
  getClientIp,
  recordGateFailure,
} from "@/lib/auth/gate-rate-limit";
import {
  RafflePasswordError,
  setRafflePasswordSessionOnResponse,
  verifySubmittedRafflePassword,
} from "@/lib/auth/raffle-password";
import { prisma } from "@/lib/prisma";
import { RaffleStatus } from "@prisma/client";
import { isRafflePasswordActive } from "@/lib/raffles/lifecycle";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const gateResponse = await enforceRaffleGateApi();
  if (gateResponse) return gateResponse;

  const { slug } = await ctx.params;
  const ip = getClientIp(req.headers);
  const limit = checkGateRateLimit(ip, `raffle:${slug}`);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many attempts. Try again in ${limit.retryAfterSec} seconds.`,
      },
      { status: 429 },
    );
  }

  const raffle = await prisma.raffle.findFirst({
    where: { slug, status: { not: RaffleStatus.DRAFT } },
    select: {
      slug: true,
      passwordProtected: true,
      passwordEnc: true,
      passwordUpdatedAt: true,
      status: true,
      startsAt: true,
      endsAt: true,
      closedAt: true,
    },
  });

  if (!raffle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isRafflePasswordActive(raffle)) {
    return NextResponse.json({ ok: true });
  }

  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = String(body.password ?? "");
  if (!password.trim()) {
    return NextResponse.json({ error: "Password is required." }, { status: 400 });
  }

  try {
    const ok = await verifySubmittedRafflePassword(raffle, password);
    if (!ok) {
      recordGateFailure(ip, `raffle:${slug}`);
      return NextResponse.json(
        { error: "Sorry, that password is incorrect." },
        { status: 401 },
      );
    }

    clearGateRateLimit(ip, `raffle:${slug}`);

    if (!raffle.passwordUpdatedAt) {
      throw new RafflePasswordError("RAFFLE_PASSWORD_NOT_CONFIGURED");
    }

    const response = NextResponse.json({ ok: true });
    setRafflePasswordSessionOnResponse(response, slug, raffle.passwordUpdatedAt);
    return response;
  } catch (error) {
    if (error instanceof RafflePasswordError) {
      return NextResponse.json(
        { error: "This raffle is not password protected." },
        { status: 503 },
      );
    }
    throw error;
  }
}
