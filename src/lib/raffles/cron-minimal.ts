import { RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { processDueRaffles } from "@/lib/raffles/process-due";

/**
 * Why cron exists: auto-finalize published raffles after endsAt when no visitor
 * triggers finalize via /api/raffles. FCFS close-on-full already runs on entry.
 */
export async function countDueAutoFinalizations(now = new Date()) {
  return prisma.raffle.count({
    where: {
      status: RaffleStatus.PUBLISHED,
      autoFinalize: true,
      endsAt: { lte: now },
    },
  });
}

export type MinimalCronResult =
  | { ok: true; skipped: true; reason: "nothing_due" }
  | { ok: true; mode: "finalize"; dueCount: number }
  | { ok: true; mode: "maintenance" };

/** One cheap COUNT; full work only when a raffle is past endsAt. */
export async function runMinimalCronMaintenance(
  options: { passwordCleanup?: boolean } = {},
) {
  const dueCount = await countDueAutoFinalizations();
  if (dueCount > 0) {
    await processDueRaffles();
    return { ok: true as const, mode: "finalize" as const, dueCount };
  }

  if (options.passwordCleanup) {
    const { clearExpiredRafflePasswords } = await import(
      "@/lib/raffles/raffle-password-cleanup"
    );
    await clearExpiredRafflePasswords().catch(() => null);
    return { ok: true as const, mode: "maintenance" as const };
  }

  return { ok: true as const, skipped: true as const, reason: "nothing_due" as const };
}

/** For admin / publish: when your external cron should ping finalize. */
export function suggestedFinalizeCronAt(endsAt: Date | null | undefined) {
  if (!endsAt) return null;
  return new Date(endsAt.getTime() + 2_000);
}
