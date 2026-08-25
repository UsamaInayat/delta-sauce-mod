import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) return null;
  return s;
}

function sign(payload: string) {
  const key = secret();
  if (!key) return null;
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function rafflePasswordCookieName(slug: string) {
  const safe = slug.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return `ds_rp_${safe}`;
}

export function createRafflePasswordSessionValue(
  slug: string,
  passwordVersion: number,
) {
  const exp = Date.now() + MAX_AGE * 1000;
  const body = `${slug}.${passwordVersion}.${exp}`;
  const signature = sign(body);
  if (!signature) {
    throw new Error("SESSION_SECRET is not set");
  }
  return `${body}.${signature}`;
}

export function rafflePasswordSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  };
}

export function verifyRafflePasswordSessionToken(token: string, slug: string) {
  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [tokenSlug, versionStr, expStr, sig] = parts;
  if (tokenSlug !== slug) return null;

  const body = `${tokenSlug}.${versionStr}.${expStr}`;
  const expected = sign(body);
  if (!expected) return null;

  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  const version = Number(versionStr);
  const exp = Number(expStr);
  if (!Number.isFinite(version) || !Number.isFinite(exp) || Date.now() > exp) {
    return null;
  }

  return { version, exp };
}

export function rafflePasswordTokenLooksValid(token: string | undefined, slug: string) {
  if (!token) return false;
  return verifyRafflePasswordSessionToken(token, slug) !== null;
}
