import { RaffleStatus } from "@prisma/client";

export type RaffleLifecycleLabel =
  | "DRAFT"
  | "SCHEDULED"
  | "LIVE"
  | "ENDED"
  | "FINALIZED";

export type RaffleLifecycleInput = {
  status: RaffleStatus;
  startsAt?: Date | null;
  endsAt?: Date | null;
  closedAt?: Date | null;
};

const FINALIZED_MAIN_LIST_MS = 4 * 24 * 60 * 60 * 1000;

export function getRaffleLifecycleLabel(
  raffle: RaffleLifecycleInput,
  now: Date = new Date(),
): RaffleLifecycleLabel {
  if (raffle.status === RaffleStatus.CLOSED) return "FINALIZED";
  if (raffle.status !== RaffleStatus.PUBLISHED) return "DRAFT";
  if (raffle.endsAt && raffle.endsAt <= now) return "ENDED";
  if (raffle.startsAt && raffle.startsAt > now) return "SCHEDULED";
  return "LIVE";
}

export function isRaffleEnterable(
  raffle: RaffleLifecycleInput,
  now: Date = new Date(),
) {
  return getRaffleLifecycleLabel(raffle, now) === "LIVE";
}

export function isRafflePubliclyVisible(
  raffle: RaffleLifecycleInput,
  now: Date = new Date(),
) {
  const label = getRaffleLifecycleLabel(raffle, now);
  return label === "LIVE" || label === "ENDED" || label === "FINALIZED";
}

export function isRaffleListedOnMainPage(
  raffle: RaffleLifecycleInput,
  now: Date = new Date(),
) {
  const label = getRaffleLifecycleLabel(raffle, now);
  if (label === "LIVE" || label === "ENDED") return true;
  if (label !== "FINALIZED") return false;

  const finalizedAt = raffle.closedAt ?? raffle.endsAt;
  if (!finalizedAt) return true;

  return now.getTime() - finalizedAt.getTime() <= FINALIZED_MAIN_LIST_MS;
}

export function isRaffleLockedFromEdits(
  raffle: RaffleLifecycleInput,
  now: Date = new Date(),
) {
  const label = getRaffleLifecycleLabel(raffle, now);
  return label === "ENDED" || label === "FINALIZED";
}
