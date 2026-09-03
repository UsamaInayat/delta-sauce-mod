import { EntryStatus, RaffleStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import {
  blacklistEntries,
  filterAdminDrawEntrants,
  filterAdminEntrants,
  filterAdminWinners,
  getExploreRaffleType,
  isRaffleFinalized,
  rerollCollectionSpots,
  rerollDrawWinners,
} from "@/lib/raffles/blacklist";

function mapEntry(entry: {
  id: string;
  walletAddress: string;
  walletEns: string | null;
  xHandle: string;
  status: EntryStatus;
  adminVisible: boolean;
  createdAt: Date;
}) {
  return {
    id: entry.id,
    walletAddress: entry.walletAddress,
    walletEns: entry.walletEns,
    xHandle: entry.xHandle,
    status: entry.status,
    adminVisible: entry.adminVisible,
    blacklisted: entry.status === EntryStatus.BLACKLISTED,
    createdAt: entry.createdAt.toISOString(),
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id } = await ctx.params;

  const raffle = await prisma.raffle.findUnique({
    where: { id },
    include: {
      entries: {
        where: { status: { not: EntryStatus.CANCELLED } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!raffle) {
    return NextResponse.json({ error: "Raffle not found" }, { status: 404 });
  }

  const exploreType = getExploreRaffleType(raffle);
  const finalized = isRaffleFinalized(raffle);

  const allEntries = raffle.entries.filter(
    (entry) => entry.adminVisible || entry.status !== EntryStatus.BLACKLISTED,
  );

  const winners = filterAdminWinners(allEntries).map(mapEntry);
  const drawEntrants = filterAdminDrawEntrants(allEntries).map(mapEntry);
  const collectionEntrants = filterAdminEntrants(allEntries, true).map(mapEntry);

  return NextResponse.json({
    raffle: {
      id: raffle.id,
      slug: raffle.slug,
      title: raffle.title,
      type: raffle.type,
      status: raffle.status,
      endsAt: raffle.endsAt?.toISOString() ?? null,
      closedAt: raffle.closedAt?.toISOString() ?? null,
      finalized,
      exploreType,
    },
    winners,
    entrants: exploreType === "draw" ? drawEntrants : collectionEntrants,
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  await requireAdminSession();
  const { id } = await ctx.params;
  const body = await req.json();
  const action = String(body.action ?? "");
  const entryIds = Array.isArray(body.entryIds)
    ? body.entryIds.map(String)
    : [];
  const table = body.table === "winners" ? "winners" : "entrants";

  const raffle = await prisma.raffle.findUnique({ where: { id } });
  if (!raffle) {
    return NextResponse.json({ error: "Raffle not found" }, { status: 404 });
  }

  try {
    if (action === "blacklist") {
      const autoRerollDraw =
        table === "winners" && getExploreRaffleType(raffle) === "draw";
      const result = await blacklistEntries({
        raffleId: id,
        entryIds,
        autoRerollDraw,
      });
      return NextResponse.json(result);
    }

    if (action === "reroll") {
      if (getExploreRaffleType(raffle) === "draw") {
        const result = await rerollDrawWinners({ raffleId: id, entryIds });
        return NextResponse.json(result);
      }
      const result = await rerollCollectionSpots({ raffleId: id, entryIds });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Action failed" },
      { status: 400 },
    );
  }
}
