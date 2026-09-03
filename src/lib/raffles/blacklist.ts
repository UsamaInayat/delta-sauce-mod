import { EntryStatus, RaffleStatus, RaffleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";
import { weightedRandomDraw } from "@/lib/raffles/finalize";
import { isDrawRaffleType, isCollectionRaffleType } from "@/lib/raffles/win-chance";
import { normalizeWallet, normalizeXHandle } from "@/lib/wallet/validate";

export const ACTIVE_ENTRY_STATUSES: EntryStatus[] = [
  EntryStatus.SUBMITTED,
  EntryStatus.ACCEPTED,
];

export function isActiveEntryStatus(status: EntryStatus) {
  return ACTIVE_ENTRY_STATUSES.includes(status);
}

export async function countActiveEntries(raffleId: string) {
  return prisma.raffleEntry.count({
    where: {
      raffleId,
      status: { in: ACTIVE_ENTRY_STATUSES },
    },
  });
}

export async function isGloballyBlacklisted(
  walletAddress: string,
  xHandle: string,
) {
  const wallet = normalizeWallet(walletAddress);
  const handle = normalizeXHandle(xHandle);
  try {
    const hit = await prisma.blacklistEntry.findFirst({
      where: {
        OR: [{ walletAddress: wallet }, { xHandle: handle }],
      },
    });
    return Boolean(hit);
  } catch {
    // Schema may still be applying on cold start (Vercel); treat as not blacklisted.
    return false;
  }
}

async function addToGlobalBlacklist(
  entries: Array<{ walletAddress: string; xHandle: string }>,
  raffleId: string,
  raffleTitle: string,
) {
  for (const entry of entries) {
    const walletAddress = normalizeWallet(entry.walletAddress);
    const xHandle = normalizeXHandle(entry.xHandle);

    const existing = await prisma.blacklistEntry.findFirst({
      where: {
        OR: [{ walletAddress }, { xHandle }],
      },
    });
    if (existing) continue;

    await prisma.blacklistEntry.create({
      data: {
        walletAddress,
        xHandle,
        raffleId,
        raffleTitle,
      },
    });
  }
}

async function pickNewDrawWinners(raffleId: string, count: number) {
  const pool = await prisma.raffleEntry.findMany({
    where: { raffleId, status: EntryStatus.SUBMITTED },
    select: { id: true },
  });

  if (!pool.length || count <= 0) return [];

  const winnerIds = weightedRandomDraw(
    pool.map((e) => ({ id: e.id, weight: 1 })),
    count,
  );

  if (winnerIds.length) {
    await prisma.raffleEntry.updateMany({
      where: { id: { in: winnerIds } },
      data: { status: EntryStatus.ACCEPTED },
    });
  }

  return winnerIds;
}

export async function blacklistEntries(input: {
  raffleId: string;
  entryIds: string[];
  autoRerollDraw?: boolean;
}) {
  const raffle = await prisma.raffle.findUnique({ where: { id: input.raffleId } });
  if (!raffle) throw new Error("Raffle not found");

  const entries = await prisma.raffleEntry.findMany({
    where: {
      id: { in: input.entryIds },
      raffleId: input.raffleId,
      status: { not: EntryStatus.CANCELLED },
    },
  });
  if (!entries.length) throw new Error("No matching entries found.");

  await addToGlobalBlacklist(entries, raffle.id, raffle.title);

  const acceptedCount = entries.filter((e) => e.status === EntryStatus.ACCEPTED).length;

  await prisma.raffleEntry.updateMany({
    where: { id: { in: entries.map((e) => e.id) } },
    data: {
      status: EntryStatus.BLACKLISTED,
      adminVisible: true,
    },
  });

  if (
    input.autoRerollDraw &&
    isDrawRaffleType(raffle.type) &&
    acceptedCount > 0
  ) {
    await pickNewDrawWinners(input.raffleId, acceptedCount);
  }

  return { blacklisted: entries.length };
}

export async function rerollDrawWinners(input: {
  raffleId: string;
  entryIds: string[];
}) {
  const raffle = await prisma.raffle.findUnique({ where: { id: input.raffleId } });
  if (!raffle) throw new Error("Raffle not found");
  if (!isDrawRaffleType(raffle.type)) {
    throw new Error("Reroll is only available for lucky draw and art giveaways.");
  }

  const winners = await prisma.raffleEntry.findMany({
    where: {
      id: { in: input.entryIds },
      raffleId: input.raffleId,
      status: EntryStatus.ACCEPTED,
    },
  });
  if (!winners.length) throw new Error("Select one or more winners to reroll.");

  const demotedIds = winners.map((w) => w.id);

  await prisma.raffleEntry.updateMany({
    where: { id: { in: demotedIds } },
    data: { status: EntryStatus.SUBMITTED },
  });

  const pool = await prisma.raffleEntry.findMany({
    where: {
      raffleId: input.raffleId,
      status: EntryStatus.SUBMITTED,
      id: { notIn: demotedIds },
    },
    select: { id: true },
  });

  const winnerIds = weightedRandomDraw(
    pool.map((e) => ({ id: e.id, weight: 1 })),
    winners.length,
  );

  if (winnerIds.length) {
    await prisma.raffleEntry.updateMany({
      where: { id: { in: winnerIds } },
      data: { status: EntryStatus.ACCEPTED },
    });
  }

  return { rerolled: winners.length, newWinnerIds: winnerIds };
}

export async function rerollCollectionSpots(input: {
  raffleId: string;
  entryIds: string[];
}) {
  const raffle = await prisma.raffle.findUnique({ where: { id: input.raffleId } });
  if (!raffle) throw new Error("Raffle not found");
  if (!isCollectionRaffleType(raffle.type)) {
    throw new Error("Spot reroll is only available for FCFS and wallet collection raffles.");
  }

  const entries = await prisma.raffleEntry.findMany({
    where: {
      id: { in: input.entryIds },
      raffleId: input.raffleId,
      status: EntryStatus.BLACKLISTED,
      adminVisible: true,
    },
  });
  if (!entries.length) {
    throw new Error("Select blacklisted entries to release their spots.");
  }

  const now = new Date();
  const endsAtInPast = !raffle.endsAt || raffle.endsAt <= now;
  const updateData: {
    status: RaffleStatus;
    endsAt?: Date;
  } = {
    status: RaffleStatus.PUBLISHED,
  };

  if (endsAtInPast) {
    updateData.endsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }

  if (raffle.status === RaffleStatus.CLOSED) {
    await prisma.raffle.update({
      where: { id: input.raffleId },
      data: updateData,
    });
  } else if (endsAtInPast) {
    await prisma.raffle.update({
      where: { id: input.raffleId },
      data: { endsAt: updateData.endsAt },
    });
  }

  return { released: entries.length, reopened: raffle.status === RaffleStatus.CLOSED };
}

export async function unblacklistEntries(blacklistIds: string[]) {
  const records = await prisma.blacklistEntry.findMany({
    where: { id: { in: blacklistIds } },
  });
  if (!records.length) throw new Error("No blacklist records found.");

  for (const record of records) {
    const orFilters: Array<{ walletAddress: string } | { xHandle: string }> = [];
    if (record.walletAddress) {
      orFilters.push({ walletAddress: record.walletAddress });
    }
    if (record.xHandle) {
      orFilters.push({ xHandle: record.xHandle });
    }

    if (orFilters.length) {
      await prisma.raffleEntry.updateMany({
        where: {
          OR: orFilters,
          status: EntryStatus.BLACKLISTED,
        },
        data: { status: EntryStatus.CANCELLED },
      });
    }

    await prisma.blacklistEntry.delete({ where: { id: record.id } });
  }

  return { unblacklisted: records.length };
}

export function filterAdminEntrants<
  T extends { status: EntryStatus; adminVisible: boolean },
>(entries: T[], includeBlacklistedVisible = false) {
  return entries.filter((entry) => {
    if (entry.status === EntryStatus.CANCELLED) return false;
    if (entry.status === EntryStatus.BLACKLISTED) {
      return includeBlacklistedVisible && entry.adminVisible;
    }
    return entry.status !== EntryStatus.EXCLUDED || includeBlacklistedVisible;
  });
}

export function filterAdminWinners<
  T extends { status: EntryStatus },
>(entries: T[]) {
  return entries.filter((entry) => entry.status === EntryStatus.ACCEPTED);
}

export function filterAdminDrawEntrants<
  T extends { status: EntryStatus; adminVisible: boolean },
>(entries: T[]) {
  return entries.filter((entry) => {
    if (entry.status === EntryStatus.CANCELLED) return false;
    if (entry.status === EntryStatus.BLACKLISTED) return false;
    if (entry.status === EntryStatus.EXCLUDED) return false;
    return true;
  });
}

export function isRaffleFinalized(raffle: {
  status: RaffleStatus;
  endsAt?: Date | null;
  closedAt?: Date | null;
}) {
  return getRaffleLifecycleLabel(raffle) === "FINALIZED";
}

export function getExploreRaffleType(raffle: { type: RaffleType }) {
  if (isDrawRaffleType(raffle.type)) return "draw" as const;
  if (isCollectionRaffleType(raffle.type)) return "collection" as const;
  return "other" as const;
}
