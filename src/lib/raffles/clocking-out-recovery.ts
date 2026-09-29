import { RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { repairRaffleEntriesAfterBlacklistMistake } from "@/lib/raffles/blacklist";
import { finalizeRaffle } from "@/lib/raffles/finalize";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

const CLOCKING_OUT_SLUG = "clocking-out";

/** Repair entrant rows and finalize the draw when the giveaway has ended. */
export async function recoverClockingOutGiveaway() {
  const repair = await repairRaffleEntriesAfterBlacklistMistake(CLOCKING_OUT_SLUG);

  const raffle = await prisma.raffle.findUnique({
    where: { slug: CLOCKING_OUT_SLUG },
  });
  if (!raffle) throw new Error(`Raffle not found: ${CLOCKING_OUT_SLUG}`);

  if (raffle.status === RaffleStatus.CLOSED) {
    return {
      repair,
      finalized: null,
      lifecycle: getRaffleLifecycleLabel(raffle),
      alreadyClosed: true as const,
    };
  }

  const lifecycle = getRaffleLifecycleLabel(raffle);
  if (lifecycle !== "ENDED") {
    return {
      repair,
      finalized: null,
      lifecycle,
      alreadyClosed: false as const,
    };
  }

  const finalized = await finalizeRaffle(raffle.id);
  return {
    repair,
    finalized,
    lifecycle: "FINALIZED" as const,
    alreadyClosed: false as const,
  };
}
