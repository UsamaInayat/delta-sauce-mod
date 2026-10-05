import { isVercelDeployment, shouldRunInProcessRaffleScheduler } from "@/lib/deploy/runtime";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { ensureRaffleSchema } = await import("@/lib/db/ensure-schema");
  try {
    await ensureRaffleSchema();
    console.info("[schema] database schema verified");
  } catch (error) {
    console.error("[schema] failed to verify database schema");
    if (error instanceof Error) console.error(error.message);
  }

  if (!isVercelDeployment()) {
    try {
      const { refreshGcMemberCacheFromDb } = await import("@/lib/x/gc-member-cache");
      await refreshGcMemberCacheFromDb();
      console.info("[gc-cache] group chat member cache loaded");
    } catch (error) {
      console.error("[gc-cache] failed to load group chat member cache");
      if (error instanceof Error) console.error(error.message);
    }
  } else {
    console.info("[gc-cache] lazy load on Vercel (first gated entry)");
  }

  if (!shouldRunInProcessRaffleScheduler()) {
    console.info(
      "[raffle-scheduler] serverless mode — use Vercel Cron + request-time finalize",
    );
    return;
  }

  const { startRaffleScheduler } = await import("@/lib/raffles/scheduler");
  startRaffleScheduler();
}
