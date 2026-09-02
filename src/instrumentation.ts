export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureRaffleSchema } = await import("@/lib/db/ensure-schema");
  try {
    await ensureRaffleSchema();
  } catch (error) {
    console.error("[schema] failed to verify raffle columns");
    if (error instanceof Error) console.error(error.message);
  }

  if (process.env.DISABLE_RAFFLE_SCHEDULER === "true") {
    console.info("[raffle-scheduler] disabled via DISABLE_RAFFLE_SCHEDULER");
    return;
  }

  const { startRaffleScheduler } = await import("@/lib/raffles/scheduler");
  startRaffleScheduler();
}
