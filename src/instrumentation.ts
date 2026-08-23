export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.DISABLE_RAFFLE_SCHEDULER === "true") {
    console.info("[raffle-scheduler] disabled via DISABLE_RAFFLE_SCHEDULER");
    return;
  }

  const { startRaffleScheduler } = await import("@/lib/raffles/scheduler");
  startRaffleScheduler();
}
