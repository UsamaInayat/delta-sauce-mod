const INTERVAL_MS = 5_000;

const globalForScheduler = globalThis as typeof globalThis & {
  __deltaRaffleSchedulerStarted?: boolean;
};

let sweepInFlight = false;

async function runSchedulerTick() {
  if (sweepInFlight) return;
  sweepInFlight = true;
  try {
    const { processDueRaffles } = await import("@/lib/raffles/process-due");
    await processDueRaffles();
  } catch (error) {
    console.error("[raffle-scheduler] tick failed", error);
  } finally {
    sweepInFlight = false;
  }
}

/** Poll every 5s — same pattern as Rafael's auto-finalize scheduler. */
export function startRaffleScheduler() {
  if (globalForScheduler.__deltaRaffleSchedulerStarted) return;
  globalForScheduler.__deltaRaffleSchedulerStarted = true;

  void runSchedulerTick();
  setInterval(() => {
    void runSchedulerTick();
  }, INTERVAL_MS);

  console.info("[raffle-scheduler] started (5s interval)");
}
