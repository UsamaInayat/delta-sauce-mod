import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE = 60 * 60 * 24 * 7;
const COOKIE = "ds_raffle_gate";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createGateToken(passwordVersion: number) {
  const exp = Date.now() + MAX_AGE * 1000;
  const body = `${passwordVersion}.${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyGateToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [versionStr, expStr, sig] = parts;
  const body = `${versionStr}.${expStr}`;
  const expected = sign(body);

  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
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
