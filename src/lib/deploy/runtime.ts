/** Long-running Node scheduler (Railway/Docker). Off by default on Vercel. */
export function shouldRunInProcessRaffleScheduler() {
  if (process.env.DISABLE_RAFFLE_SCHEDULER === "true") return false;
  if (process.env.ENABLE_RAFFLE_SCHEDULER === "true") return true;
  return process.env.VERCEL !== "1";
}

export function isVercelDeployment() {
  return process.env.VERCEL === "1";
}
