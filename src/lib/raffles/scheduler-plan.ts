import { RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

/** Minimum delay between scheduler DB checks. */
export const RAFFLE_SCHEDULER_MIN_SLEEP_MS = 1_000;

/** Wake slightly after endsAt so lifecycle flips to ENDED before finalize. */
export const RAFFLE_SCHEDULER_END_BUFFER_MS = 2_000;

/** Idle password cleanup + detect new publishes (no raffles on the timeline). */
export const RAFFLE_SCHEDULER_IDLE_MS = 6 * 60 * 60 * 1000;

/** Cap one sleep stretch (re-plan after wake for long waits). */
export const RAFFLE_SCHEDULER_MAX_SLEEP_MS = 24 * 60 * 60 * 1000;

export type RaffleSchedulerMode =
  | "idle"
  | "event_wait"
  | "finalize_now";

export type RaffleSchedulerPlan = {
  shouldRunProcess: boolean;
  nextDelayMs: number;
  mode: RaffleSchedulerMode;
};

const publishedSelect = {
  status: true,
  startsAt: true,
  endsAt: true,
  closedAt: true,
  autoFinalize: true,
} as const;

export async function planRaffleSchedulerTick(
  now = new Date(),
): Promise<RaffleSchedulerPlan> {
  const published = await prisma.raffle.findMany({
    where: { status: RaffleStatus.PUBLISHED },
    select: publishedSelect,
  });

  let mustProcessNow = false;
  let soonestWakeMs: number | null = null;

  for (const raffle of published) {
    const label = getRaffleLifecycleLabel(raffle, now);

    if (label === "ENDED") {
      if (raffle.autoFinalize) {
        mustProcessNow = true;
      }
      continue;
    }

    if (label === "LIVE" && raffle.autoFinalize && raffle.endsAt) {
      const msUntilFinalize =
        raffle.endsAt.getTime() - now.getTime() + RAFFLE_SCHEDULER_END_BUFFER_MS;
      if (msUntilFinalize <= 0) {
        mustProcessNow = true;
      } else {
        soonestWakeMs =
          soonestWakeMs === null
            ? msUntilFinalize
            : Math.min(soonestWakeMs, msUntilFinalize);
      }
      continue;
    }

    if (label === "SCHEDULED" && raffle.startsAt) {
      const msUntilStart = raffle.startsAt.getTime() - now.getTime();
      if (msUntilStart > 0) {
        soonestWakeMs =
          soonestWakeMs === null
            ? msUntilStart
            : Math.min(soonestWakeMs, msUntilStart);
      }
    }
  }

  if (mustProcessNow) {
    return {
      shouldRunProcess: true,
      nextDelayMs: RAFFLE_SCHEDULER_IDLE_MS,
      mode: "finalize_now",
    };
  }

  if (soonestWakeMs !== null) {
    const capped = Math.min(soonestWakeMs, RAFFLE_SCHEDULER_MAX_SLEEP_MS);
    return {
      shouldRunProcess: false,
      nextDelayMs: Math.max(RAFFLE_SCHEDULER_MIN_SLEEP_MS, capped),
      mode: "event_wait",
    };
  }

  return {
    shouldRunProcess: true,
    nextDelayMs: RAFFLE_SCHEDULER_IDLE_MS,
    mode: "idle",
  };
}
