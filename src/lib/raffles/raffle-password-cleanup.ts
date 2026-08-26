import { prisma } from "@/lib/prisma";
import { isRafflePasswordActive } from "@/lib/raffles/lifecycle";

export async function clearExpiredRafflePasswords(now = new Date()) {
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
      passwordProtected: true,
      passwordEnc: true,
    },
  });

  for (const raffle of protectedRaffles) {
    if (isRafflePasswordActive(raffle, now)) continue;

    await prisma.raffle.update({
      where: { id: raffle.id },
      data: {
        passwordEnc: null,
        passwordUpdatedAt: null,
      },
    });
  }
}
