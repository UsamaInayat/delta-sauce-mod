const DRAW_RAFFLE_TYPES = new Set(["LUCKY_DRAW", "ARTWORK_GIVEAWAY"]);

export function isDrawRaffleType(type: string) {
  return DRAW_RAFFLE_TYPES.has(type);
}

export function drawWinChancePercent(spots: number, entries: number) {
  if (spots <= 0) return 0;
  if (entries <= 0) return 100;
  return Math.min(100, (spots / entries) * 100);
}

export function formatWinChancePercent(percent: number) {
  const value = Math.min(100, Math.max(0, percent));
  if (value >= 99.95) return "100%";
  if (value >= 10) return `${Math.round(value)}%`;
  const digits = value >= 1 ? 1 : 2;
  return `${Number(value.toFixed(digits))}%`;
}

export function buildDrawWinChance(spots: number, entries: number) {
  const percent = drawWinChancePercent(spots, entries);
  return {
    percent,
    label: formatWinChancePercent(percent),
    spots,
    entries,
  };
}

export function drawWinChanceCopy(label: string) {
  return `You have a ${label} chance of winning this raffle currently.`;
}
