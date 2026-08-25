import { NextRequest, NextResponse } from "next/server";
import {
  checkGateRateLimit,
  clearGateRateLimit,
  getClientIp,
  recordGateFailure,
} from "@/lib/auth/gate-rate-limit";
import {
  RaffleGateError,
  setRaffleGateSession,
  verifySubmittedGatePassword,
} from "@/lib/auth/raffle-gate";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limit = checkGateRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many attempts. Try again in ${limit.retryAfterSec} seconds.`,
      },
      { status: 429 },
    );
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
    const ok = await verifySubmittedGatePassword(password);
    if (!ok) {
      recordGateFailure(ip);
      return NextResponse.json({ error: "Sorry, that password is incorrect." }, {
        status: 401,
      });
    }

    clearGateRateLimit(ip);
    await setRaffleGateSession();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof RaffleGateError) {
      return NextResponse.json(
        { error: "Raffle access is not configured yet. Contact the admin." },
        { status: 503 },
      );
    }
    throw error;
  }
}
