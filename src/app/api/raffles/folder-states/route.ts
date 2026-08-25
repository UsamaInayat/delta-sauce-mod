import { NextRequest, NextResponse } from "next/server";
import { RaffleStatus } from "@prisma/client";
import { enforceRaffleGateApi } from "@/lib/auth/gate-api";
import { prisma } from "@/lib/prisma";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";
import { lookupEntryResult } from "@/lib/raffles/entry";

export async function POST(req: NextRequest) {
  const gateResponse = await enforceRaffleGateApi();
  if (gateResponse) return gateResponse;

  const body = await req.json();
  const wallets = (body.wallets ?? {}) as Record<string, string>;

  const raffles = await prisma.raffle.findMany({
    where: { status: { not: RaffleStatus.DRAFT } },
    select: { id: true, slug: true, status: true, startsAt: true, endsAt: true },
  });

  const states: Record<string, "live" | "won" | "lost"> = {};

  for (const raffle of raffles) {
    const lifecycle = getRaffleLifecycleLabel(raffle);

    if (lifecycle === "LIVE") {
      states[raffle.slug] = "live";
      continue;
    }

    if (lifecycle !== "ENDED" && lifecycle !== "FINALIZED") {
      continue;
    }

    const wallet = wallets[raffle.slug]?.trim();
    if (!wallet) {
      states[raffle.slug] = "lost";
      continue;
    }

    try {
      const lookup = await lookupEntryResult({
        raffleId: raffle.id,
        walletInput: wallet,
      });
      states[raffle.slug] = lookup.found && lookup.won ? "won" : "lost";
    } catch {
      states[raffle.slug] = "lost";
    }
  }

  return NextResponse.json({ states });
}
