import { RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

type AutoFinalizeInput = {
  id: string;
  status: RaffleStatus;
  autoFinalize: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  closedAt?: Date | null;
};

/** Finalize once when end time has passed (no polling required). */
export async function triggerAutoFinalizeIfDue(
  raffle: AutoFinalizeInput,
  now = new Date(),
): Promise<boolean> {
  if (raffle.status !== RaffleStatus.PUBLISHED || !raffle.autoFinalize) {
    return false;
  }
  if (getRaffleLifecycleLabel(raffle, now) !== "ENDED") {
    return false;
  }

  const { finalizeRaffle } = await import("@/lib/raffles/finalize");
  await finalizeRaffle(raffle.id).catch(() => null);
  return true;
}

export async function finalizeAllDuePublishedRaffles(now = new Date()) {
  const published = await prisma.raffle.findMany({
    where: { status: RaffleStatus.PUBLISHED, autoFinalize: true },
    select: {
      id: true,
      status: true,
      autoFinalize: true,
      startsAt: true,
      endsAt: true,
      closedAt: true,
    },
  });

  let finalized = 0;
  for (const raffle of published) {
    const did = await triggerAutoFinalizeIfDue(raffle, now);
    if (did) finalized += 1;
  }
  return finalized;
}
