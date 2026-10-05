const globalForScheduler = globalThis as typeof globalThis & {
  __deltaRaffleSchedulerStarted?: boolean;
  __deltaRaffleSchedulerWake?: () => void;
};

let sweepInFlight = false;
let sleepTimer: ReturnType<typeof setTimeout> | null = null;
let lastLoggedMode: string | null = null;

function clearSleepTimer() {
  if (sleepTimer !== null) {
    clearTimeout(sleepTimer);
    sleepTimer = null;
  }
}

function waitForNextTick(delayMs: number) {
  clearSleepTimer();
  return new Promise<void>((resolve) => {
    globalForScheduler.__deltaRaffleSchedulerWake = () => {
      clearSleepTimer();
      resolve();
    };
    sleepTimer = setTimeout(() => {
      sleepTimer = null;
      resolve();
    }, delayMs);
  });
}

/** Interrupt a long sleep (e.g. right after publishing a raffle). */
export function wakeRaffleScheduler() {
  globalForScheduler.__deltaRaffleSchedulerWake?.();
}

async function runSchedulerLoop() {
  while (true) {
    if (sweepInFlight) {
      await waitForNextTick(1_000);
      continue;
    }

    sweepInFlight = true;
    let nextDelayMs = 30 * 60 * 1000;

    try {
      const { planRaffleSchedulerTick } = await import(
        "@/lib/raffles/scheduler-plan"
      );
      const { processDueRaffles } = await import("@/lib/raffles/process-due");

      const plan = await planRaffleSchedulerTick();
      nextDelayMs = plan.nextDelayMs;

      if (lastLoggedMode !== plan.mode) {
        lastLoggedMode = plan.mode;
        const detail =
          plan.mode === "event_wait"
            ? `sleeping ${Math.round(plan.nextDelayMs / 1000)}s until next startsAt/endsAt`
            : plan.mode === "finalize_now"
              ? "running auto-finalize"
              : `idle checks every ${Math.round(plan.nextDelayMs / 3_600_000)}h`;
        console.info(`[raffle-scheduler] mode=${plan.mode} (${detail})`);
      }

      if (plan.shouldRunProcess) {
        await processDueRaffles();
      }
    } catch (error) {
      console.error("[raffle-scheduler] tick failed", error);
      nextDelayMs = 60_000;
    } finally {
      sweepInFlight = false;
    }

    await waitForNextTick(nextDelayMs);
  }
}

/**
 * Event-driven finalize: one DB plan per wake, sleep until startsAt/endsAt.
 * No polling while raffles are live. Idle maintenance ~every 6h.
 */
export function startRaffleScheduler() {
  if (globalForScheduler.__deltaRaffleSchedulerStarted) return;
  globalForScheduler.__deltaRaffleSchedulerStarted = true;

  void runSchedulerLoop();
  console.info("[raffle-scheduler] started (adaptive interval)");
}
