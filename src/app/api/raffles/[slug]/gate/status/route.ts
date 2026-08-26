import { NextResponse } from "next/server";
import { enforceRaffleGateApi } from "@/lib/auth/gate-api";
import { isRafflePasswordUnlocked } from "@/lib/auth/raffle-password";
import { prisma } from "@/lib/prisma";
import { RaffleStatus } from "@prisma/client";
import { isRafflePasswordActive } from "@/lib/raffles/lifecycle";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const gateResponse = await enforceRaffleGateApi();
  if (gateResponse) return gateResponse;

  const { slug } = await ctx.params;

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

  const required = isRafflePasswordActive(raffle);
  const unlocked = required ? await isRafflePasswordUnlocked(raffle, slug) : true;

  return NextResponse.json({
    required,
    unlocked,
    configured: required,
  });
}
