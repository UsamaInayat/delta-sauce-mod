import { createHmac, timingSafeEqual } from "crypto";
import {
  GATE_SESSION_TTL_SEC,
  gateSessionCookieOptions,
} from "@/lib/auth/gate-session-config";

const COOKIE = "ds_raffle_gate_v2";
const LEGACY_COOKIE = "ds_raffle_gate";

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
  const exp = Date.now() + GATE_SESSION_TTL_SEC * 1000;
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

export { gateSessionCookieOptions };

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

export { COOKIE, LEGACY_COOKIE };
