import { createHmac, timingSafeEqual } from "crypto";

const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createAdminToken(username: string) {
  const exp = Date.now() + MAX_AGE * 1000;
  const body = `${username}.${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyAdminToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [username, expStr, sig] = parts;
  const body = `${username}.${expStr}`;
  const expected = sign(body);
  try {
    if (
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ||
      Date.now() > Number(expStr)
    ) {
      return null;
    }
  } catch {
    return null;
  }
  return username;
}

export { MAX_AGE };
