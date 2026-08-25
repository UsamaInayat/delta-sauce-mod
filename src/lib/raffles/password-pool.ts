import { prisma } from "@/lib/prisma";
import { RAFFLE_PASSWORD_DICTIONARY } from "@/lib/raffles/password-dictionary";

export async function ensurePasswordWordPoolSeeded() {
  const count = await prisma.rafflePasswordWord.count();
  if (count >= RAFFLE_PASSWORD_DICTIONARY.length) return;

  await prisma.rafflePasswordWord.createMany({
    data: RAFFLE_PASSWORD_DICTIONARY.map((word) => ({ word })),
    skipDuplicates: true,
  });
}

export class RafflePasswordPoolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RafflePasswordPoolError";
  }
}

export async function assignPasswordWordForRaffle(raffleId: string) {
  await ensurePasswordWordPoolSeeded();

  return prisma.$transaction(async (tx) => {
    const available = await tx.rafflePasswordWord.findMany({
      where: { available: true },
      select: { id: true, word: true },
    });

    if (!available.length) {
      throw new RafflePasswordPoolError(
        "No dictionary passwords are available. Try again after older raffles leave the main page.",
      );
    }

    const pick = available[Math.floor(Math.random() * available.length)];

    await tx.rafflePasswordWord.update({
      where: { id: pick.id },
      data: { available: false },
    });

    await tx.raffle.update({
      where: { id: raffleId },
      data: { passwordWordId: pick.id },
    });

    return pick;
  });
}

export async function releasePasswordWordForRaffle(raffleId: string) {
  const raffle = await prisma.raffle.findUnique({
    where: { id: raffleId },
    select: { passwordWordId: true },
  });

  if (!raffle?.passwordWordId) return;

  await prisma.$transaction(async (tx) => {
    await tx.rafflePasswordWord.update({
      where: { id: raffle.passwordWordId! },
      data: { available: true },
    });

    await tx.raffle.update({
      where: { id: raffleId },
      data: {
        passwordEnc: null,
        passwordWordId: null,
        passwordUpdatedAt: null,
      },
    });
  });
}

export async function releaseExpiredRafflePasswords(now = new Date()) {
  const { isRaffleListedOnMainPage } = await import("@/lib/raffles/lifecycle");

  const protectedRaffles = await prisma.raffle.findMany({
    where: {
      passwordProtected: true,
      passwordEnc: { not: null },
    },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      closedAt: true,
    },
  });

  for (const raffle of protectedRaffles) {
    if (!isRaffleListedOnMainPage(raffle, now)) {
      await releasePasswordWordForRaffle(raffle.id);
    }
  }
}
