import { EntryStatus, RaffleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { walletHoldsAnyCollection } from "@/lib/blockchain/holdings";
import { isRaffleEnterable } from "@/lib/raffles/lifecycle";
import { closeFcfsIfFull, takeRaffleLiveSnapshots } from "@/lib/raffles/finalize";
import {
  normalizeWallet,
  normalizeXHandle,
  resolveWalletInput,
} from "@/lib/wallet/validate";

async function walletInLiveSnapshot(raffleId: string, wallet: string) {
  const rows = await prisma.snapshotHolder.findMany({
    where: {
      snapshot: { raffleId, source: "raffle_live" },
      walletAddress: normalizeWallet(wallet),
    },
    take: 1,
  });
  return rows.length > 0;
}

export async function submitEntry(input: {
  raffleId: string;
  walletInput: string;
  xHandle: string;
}) {
  const raffle = await prisma.raffle.findUnique({
    where: { id: input.raffleId },
    include: { collections: { include: { collection: true } } },
  });
  if (!raffle) throw new Error("Raffle not found");
  if (!isRaffleEnterable(raffle)) throw new Error("This raffle is not accepting entries right now.");

  const { address, ens } = await resolveWalletInput(input.walletInput);
  const xHandle = normalizeXHandle(input.xHandle);
  if (!xHandle) throw new Error("X handle is required.");

  const existingWallet = await prisma.raffleEntry.findUnique({
    where: { raffleId_walletAddress: { raffleId: raffle.id, walletAddress: address } },
  });
  const existingX = await prisma.raffleEntry.findUnique({
    where: { raffleId_xHandle: { raffleId: raffle.id, xHandle } },
  });

  if (existingX && existingX.walletAddress !== address) {
    throw new Error("This X account is already registered with a different wallet.");
  }

  if (raffle.tokenGated && raffle.collections.length) {
    const cols = raffle.collections.map((rc) => rc.collection);
    const { holds } = await walletHoldsAnyCollection(address, cols);
    if (!holds) {
      const names = cols.map((c) => c.name).join(", ");
      throw new Error(`You do not hold an NFT from: ${names}`);
    }

    if (raffle.liveSnapshotAt) {
      const inSnapshot = await walletInLiveSnapshot(raffle.id, address);
      if (!inSnapshot) {
        const names = cols.map((c) => c.name).join(", ");
        throw new Error(
          `Your wallet was not holding at raffle go-live for: ${names}`,
        );
      }
    }
  }

  if (raffle.type === RaffleType.FCFS) {
    const cap = raffle.winnerCount ?? raffle.spotCap;
    if (cap) {
      const count = await prisma.raffleEntry.count({
        where: { raffleId: raffle.id, status: { not: EntryStatus.CANCELLED } },
      });
      if (count >= cap && !existingWallet) {
        throw new Error("All spots have been filled.");
      }
    }
  }

  const data = {
    walletAddress: normalizeWallet(address),
    walletEns: ens,
    xHandle,
    status: EntryStatus.SUBMITTED,
  };

  let entry;
  if (existingWallet) {
    if (existingWallet.status === EntryStatus.CANCELLED) {
      entry = await prisma.raffleEntry.update({
        where: { id: existingWallet.id },
        data,
      });
    } else {
      entry = await prisma.raffleEntry.update({
        where: { id: existingWallet.id },
        data,
      });
    }
  } else {
    entry = await prisma.raffleEntry.create({
      data: { raffleId: raffle.id, ...data },
    });
  }

  if (
    raffle.tokenGated &&
    !raffle.liveSnapshotAt &&
    isRaffleEnterable(raffle)
  ) {
    await takeRaffleLiveSnapshots(raffle.id);
  }

  await closeFcfsIfFull(raffle.id);
  return entry;
}

export async function cancelEntry(input: {
  raffleId: string;
  walletInput: string;
}) {
  const raffle = await prisma.raffle.findUnique({ where: { id: input.raffleId } });
  if (!raffle) throw new Error("Raffle not found");
  if (!isRaffleEnterable(raffle)) throw new Error("Entries can no longer be cancelled.");

  const { address } = await resolveWalletInput(input.walletInput);
  const entry = await prisma.raffleEntry.findUnique({
    where: {
      raffleId_walletAddress: {
        raffleId: raffle.id,
        walletAddress: normalizeWallet(address),
      },
    },
  });
  if (!entry || entry.status === EntryStatus.CANCELLED) {
    throw new Error("No active entry found for this wallet.");
  }

  return prisma.raffleEntry.update({
    where: { id: entry.id },
    data: { status: EntryStatus.CANCELLED },
  });
}

export async function lookupEntryResult(input: {
  raffleId: string;
  walletInput: string;
}) {
  const { address } = await resolveWalletInput(input.walletInput);
  const entry = await prisma.raffleEntry.findUnique({
    where: {
      raffleId_walletAddress: {
        raffleId: input.raffleId,
        walletAddress: normalizeWallet(address),
      },
    },
  });
  if (!entry || entry.status === EntryStatus.CANCELLED) {
    return { found: false as const };
  }

  const raffle = await prisma.raffle.findUnique({ where: { id: input.raffleId } });
  if (!raffle) return { found: false as const };

  const finalized = raffle.status === "CLOSED";
  const won = entry.status === EntryStatus.ACCEPTED;
  const lost =
    finalized &&
    (entry.status === EntryStatus.SUBMITTED ||
      entry.status === EntryStatus.REJECTED ||
      entry.status === EntryStatus.EXCLUDED);

  return {
    found: true as const,
    entry,
    finalized,
    won,
    lost,
    wallet: entry.walletAddress,
  };
}
