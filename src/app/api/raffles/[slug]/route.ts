import { NextRequest, NextResponse } from "next/server";
import { RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getRaffleLifecycleLabel,
  isRaffleEnterable,
  isRafflePubliclyVisible,
} from "@/lib/raffles/lifecycle";
import { lookupEntryResult } from "@/lib/raffles/entry";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const walletQuery = req.nextUrl.searchParams.get("wallet") ?? "";

  const raffle = await prisma.raffle.findFirst({
    where: { slug, status: { not: RaffleStatus.DRAFT } },
    include: {
      collections: { include: { collection: true } },
      _count: { select: { entries: true } },
    },
  });

  if (!raffle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isRafflePubliclyVisible(raffle)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lifecycle = getRaffleLifecycleLabel(raffle);
  let userEntry = null;
  let result = null;

  if (walletQuery.trim()) {
    try {
      const lookup = await lookupEntryResult({
        raffleId: raffle.id,
        walletInput: walletQuery,
      });
      if (lookup.found) {
        userEntry = {
          walletAddress: lookup.entry.walletAddress,
          walletEns: lookup.entry.walletEns,
          xHandle: lookup.entry.xHandle,
          status: lookup.entry.status,
        };
        result = {
          finalized: lookup.finalized,
          won: lookup.won,
          lost: lookup.lost,
          wallet: lookup.wallet,
        };
      }
    } catch {
      // ignore invalid wallet query
    }
  }

  return NextResponse.json({
    raffle: {
      slug: raffle.slug,
      title: raffle.title,
      phase: raffle.phase,
      artist: raffle.artist,
      description: raffle.description,
      type: raffle.type,
      chain: raffle.chain,
      startsAt: raffle.startsAt?.toISOString() ?? null,
      endsAt: raffle.endsAt?.toISOString() ?? null,
      winnerCount: raffle.winnerCount,
      spotCap: raffle.spotCap,
      tokenGated: raffle.tokenGated,
      lifecycle,
      enterable: isRaffleEnterable(raffle),
      collections: raffle.collections.map((rc) => ({
        name: rc.collection.name,
      })),
      entryCount: raffle._count.entries,
      userEntry,
      result,
    },
  });
}
