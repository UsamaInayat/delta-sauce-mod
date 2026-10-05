import { finalizeAllDuePublishedRaffles } from "@/lib/raffles/auto-finalize";
import { processDueRaffles } from "@/lib/raffles/process-due";
import { shouldRunInProcessRaffleScheduler } from "@/lib/deploy/runtime";

/** Finalize on user traffic (primary path on Vercel — no cron needed at close). */
export async function runRaffleRequestMaintenance() {
  await finalizeAllDuePublishedRaffles();
}

/** After publish / schedule edits — wake long-running scheduler or run once on serverless. */
export async function kickRaffleMaintenance() {
  if (shouldRunInProcessRaffleScheduler()) {
    const { wakeRaffleScheduler } = await import("@/lib/raffles/scheduler");
    wakeRaffleScheduler();
    return;
  }
  await processDueRaffles();
}
