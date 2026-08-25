import { RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

export async function processDueRaffles() {
  const now = new Date();
  const published = await prisma.raffle.findMany({
    where: { status: RaffleStatus.PUBLISHED },
  });

  for (const raffle of published) {
    const label = getRaffleLifecycleLabel(raffle, now);

    if (label === "ENDED" && raffle.autoFinalize) {
      const { finalizeRaffle } = await import("@/lib/raffles/finalize");
      await finalizeRaffle(raffle.id).catch(() => null);
    }
  }

  const { clearExpiredRafflePasswords } = await import("@/lib/raffles/raffle-password-cleanup");
  await clearExpiredRafflePasswords(now).catch(() => null);
}
