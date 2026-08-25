import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE = 60 * 60 * 24 * 7;
const COOKIE = "ds_raffle_gate";

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

export function createGateSessionValue(passwordVersion: number) {
  const exp = Date.now() + MAX_AGE * 1000;
  const body = `${passwordVersion}.${exp}`;
  const signature = sign(body);
  if (!signature) {
    throw new Error("SESSION_SECRET is not set");
  }
  return `${body}.${signature}`;
}

export function createGateToken(passwordVersion: number) {
  return createGateSessionValue(passwordVersion);
}

export function gateSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  };
}

export function verifyGateToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [versionStr, expStr, sig] = parts;
  const body = `${versionStr}.${expStr}`;
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

export function gateTokenLooksValid(token: string | undefined) {
  if (!token) return false;
  return verifyGateToken(token) !== null;
}

export { COOKIE, MAX_AGE };
