import { prisma } from "@/lib/prisma";
import { isRaffleListedOnMainPage } from "@/lib/raffles/lifecycle";

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
    },
  });

  for (const raffle of protectedRaffles) {
    if (!isRaffleListedOnMainPage(raffle, now)) {
      await prisma.raffle.update({
        where: { id: raffle.id },
        data: {
          passwordEnc: null,
          passwordUpdatedAt: null,
        },
      });
    }
  }
}
