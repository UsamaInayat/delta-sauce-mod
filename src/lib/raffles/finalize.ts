import { randomInt } from "crypto";
import {
  EntryStatus,
  RaffleStatus,
  RaffleType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { walletHoldsAnyCollection } from "@/lib/blockchain/holdings";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

export function weightedRandomDraw(
  entries: Array<{ id: string; weight: number }>,
  count: number,
): string[] {
  const pool = [...entries];
  const winnerIds: string[] = [];
  const needed = Math.min(count, pool.length);

  while (winnerIds.length < needed && pool.length > 0) {
    const totalWeight = pool.reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight <= 0) break;
    let roll = randomInt(totalWeight);
    let picked = pool[0];
    for (const entry of pool) {
      roll -= entry.weight;
      if (roll < 0) {
        picked = entry;
        break;
      }
    }
    winnerIds.push(picked.id);
    pool.splice(pool.indexOf(picked), 1);
  }
  return winnerIds;
}

export async function purgeNonHolders(raffleId: string) {
  const raffle = await prisma.raffle.findUnique({
    where: { id: raffleId },
    include: { collections: { include: { collection: true } } },
  });
  if (!raffle?.tokenGated) return 0;

  const cols = raffle.collections.map((rc) => rc.collection);
  const entries = await prisma.raffleEntry.findMany({
    where: { raffleId, status: EntryStatus.SUBMITTED },
  });

  let removed = 0;
  for (const entry of entries) {
    const { holds } = await walletHoldsAnyCollection(entry.walletAddress, cols);
    if (!holds) {
      await prisma.raffleEntry.update({
        where: { id: entry.id },
        data: { status: EntryStatus.EXCLUDED },
      });
      removed += 1;
    }
  }
  return removed;
}

export async function finalizeRaffle(raffleId: string) {
  const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle) throw new Error("Raffle not found");
  if (raffle.status === RaffleStatus.CLOSED) {
    throw new Error("Already finalized");
  }
  const label = getRaffleLifecycleLabel(raffle);
  if (label !== "ENDED" && label !== "LIVE") {
    throw new Error("Raffle is not ready to finalize");
  }

  if (raffle.tokenGated) {
    await purgeNonHolders(raffleId);
  }

  if (
    raffle.type === RaffleType.FCFS ||
    raffle.type === RaffleType.WALLET_COLLECTION
  ) {
    await prisma.raffleEntry.updateMany({
      where: { raffleId, status: EntryStatus.SUBMITTED },
      data: { status: EntryStatus.ACCEPTED },
    });
    await prisma.raffle.update({
      where: { id: raffleId },
      data: { status: RaffleStatus.CLOSED, closedAt: new Date() },
    });
    return { mode: "collection" as const };
  }

  const winnerCount = raffle.winnerCount ?? 1;
  const entries = await prisma.raffleEntry.findMany({
    where: { raffleId, status: EntryStatus.SUBMITTED },
    select: { id: true },
  });

  const winnerIds = weightedRandomDraw(
    entries.map((e) => ({ id: e.id, weight: 1 })),
    winnerCount,
  );

  if (winnerIds.length) {
    await prisma.raffleEntry.updateMany({
      where: { id: { in: winnerIds } },
      data: { status: EntryStatus.ACCEPTED },
    });
  }

  await prisma.raffle.update({
    where: { id: raffleId },
    data: { status: RaffleStatus.CLOSED, closedAt: new Date() },
  });

  return { mode: "draw" as const, winnerIds };
}

export async function takeRaffleLiveSnapshots(raffleId: string) {
  const raffle = await prisma.raffle.findUnique({
    where: { id: raffleId },
    include: { collections: { include: { collection: true } } },
  });
  if (!raffle) return;

  for (const { collection } of raffle.collections) {
    const holders = await fetchCollectionHoldersSafe(collection);
    const snapshot = await prisma.collectionSnapshot.create({
      data: {
        collectionId: collection.id,
        raffleId,
        source: "raffle_live",
      },
    });
    if (holders.length) {
      await prisma.snapshotHolder.createMany({
        data: holders.map((h) => ({
          snapshotId: snapshot.id,
          walletAddress: h.walletAddress,
          balance: h.balance,
        })),
      });
    }
  }

  await prisma.raffle.update({
    where: { id: raffleId },
    data: { liveSnapshotAt: new Date() },
  });
}

async function fetchCollectionHoldersSafe(collection: {
  contractAddress: string;
  chain: import("@prisma/client").RaffleChain;
}) {
  const { fetchCollectionHolders } = await import("@/lib/blockchain/holdings");
  try {
    return await fetchCollectionHolders({
      contractAddress: collection.contractAddress,
      chain: collection.chain,
    });
  } catch {
    return [];
  }
}

export async function closeFcfsIfFull(raffleId: string) {
  const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
  if (!raffle || raffle.type !== RaffleType.FCFS || !raffle.spotCap) return false;

  const count = await prisma.raffleEntry.count({
    where: { raffleId, status: EntryStatus.SUBMITTED },
  });
  if (count < raffle.spotCap) return false;

  await finalizeRaffle(raffleId);
  return true;
}

export async function processDueRaffles() {
  const now = new Date();
  const published = await prisma.raffle.findMany({
    where: { status: RaffleStatus.PUBLISHED },
  });

  for (const raffle of published) {
    const label = getRaffleLifecycleLabel(raffle, now);

    if (
      label === "LIVE" &&
      raffle.tokenGated &&
      !raffle.liveSnapshotAt &&
      raffle.startsAt &&
      raffle.startsAt <= now
    ) {
      await takeRaffleLiveSnapshots(raffle.id);
    }

    if (label === "ENDED" && raffle.autoFinalize) {
      await finalizeRaffle(raffle.id).catch(() => null);
    }
  }
}
