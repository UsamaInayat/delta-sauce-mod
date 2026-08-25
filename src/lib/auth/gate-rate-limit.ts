import { createHash } from "crypto";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type AttemptBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, AttemptBucket>();

function hashKey(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

export function checkGateRateLimit(ip: string, scope = "platform") {
  const key = hashKey(`${scope}:${ip}`);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 0, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return { allowed: true, retryAfterSec: 0 };
}

export function recordGateFailure(ip: string, scope = "platform") {
  const key = hashKey(`${scope}:${ip}`);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  bucket.count += 1;
  buckets.set(key, bucket);
}

export function clearGateRateLimit(ip: string, scope = "platform") {
  buckets.delete(hashKey(`${scope}:${ip}`));
}
