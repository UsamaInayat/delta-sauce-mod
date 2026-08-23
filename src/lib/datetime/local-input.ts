const DATE_TIME_LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Parse a datetime-local string in the user's browser timezone. */
export function parseDateTimeLocalValue(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = DATE_TIME_LOCAL_PATTERN.exec(trimmed);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const parsed = new Date(year, month, day, hour, minute, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Serialize browser-local input to UTC ISO for API/storage. */
export function localInputToIso(value: string): string | null {
  const parsed = parseDateTimeLocalValue(value);
  return parsed ? parsed.toISOString() : null;
}

/** Format a stored instant for datetime-local inputs (browser local time). */
export function toDateTimeLocalInputValue(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";

  if (typeof value === "string") {
    const trimmed = value.trim();
    const localMatch = DATE_TIME_LOCAL_PATTERN.exec(trimmed);
    if (localMatch) {
      return `${localMatch[1]}-${localMatch[2]}-${localMatch[3]}T${localMatch[4]}:${localMatch[5]}`;
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Format a stored instant for display in the user's local timezone. */
export function formatLocalDateTime(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "TBA";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "TBA";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  });
}

export function parseStoredDateTime(value: unknown): Date | null {
  if (value == null || value === "") return null;
  const str = String(value).trim();
  if (DATE_TIME_LOCAL_PATTERN.test(str)) {
    return parseDateTimeLocalValue(str);
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
