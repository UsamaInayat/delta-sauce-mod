import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  decryptGatePassword,
  encryptGatePassword,
  verifyGatePassword,
} from "@/lib/auth/gate-crypto";
import {
  COOKIE,
  createGateSessionValue,
  gateSessionCookieOptions,
  LEGACY_COOKIE,
  verifyGateToken,
} from "@/lib/auth/gate-token";

function expiredGateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

export class RaffleGateError extends Error {
  constructor(message = "RAFFLE_GATE_REQUIRED") {
    super(message);
    this.name = "RaffleGateError";
  }
}

const GATE_ID = "default";

export async function findGateRecord() {
  return prisma.platformGate.findUnique({ where: { id: GATE_ID } });
}

export async function getGatePasswordPlaintext() {
  const gate = await findGateRecord();
  if (!gate) return null;
  return decryptGatePassword(gate.passwordEnc);
}

export async function updateGatePassword(password: string) {
  const trimmed = password.trim();
  if (!trimmed) {
    throw new Error("Password cannot be empty.");
  }

  const now = new Date();
  return prisma.platformGate.upsert({
    where: { id: GATE_ID },
    create: {
      id: GATE_ID,
      passwordEnc: encryptGatePassword(trimmed),
      passwordUpdatedAt: now,
    },
    update: {
      passwordEnc: encryptGatePassword(trimmed),
      passwordUpdatedAt: now,
    },
  });
}

export async function verifySubmittedGatePassword(password: string) {
  const gate = await findGateRecord();
  if (!gate) throw new RaffleGateError("RAFFLE_GATE_NOT_CONFIGURED");
  return verifyGatePassword(password, gate.passwordEnc);
}

export async function setRaffleGateSession() {
  const gate = await findGateRecord();
  if (!gate) throw new RaffleGateError("RAFFLE_GATE_NOT_CONFIGURED");

  const token = createGateSessionValue(gate.passwordUpdatedAt.getTime());
  const jar = await cookies();
  jar.set(COOKIE, token, gateSessionCookieOptions());
  jar.set(LEGACY_COOKIE, "", expiredGateCookieOptions());
}

export async function clearRaffleGateSession() {
  const jar = await cookies();
  const expired = expiredGateCookieOptions();
  jar.set(COOKIE, "", expired);
  jar.set(LEGACY_COOKIE, "", expired);
}

export async function isRaffleGateUnlocked() {
  try {
    await requireRaffleGate();
    return true;
  } catch {
    return false;
  }
}

export async function requireRaffleGate() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) throw new RaffleGateError();

  const parsed = verifyGateToken(token);
  if (!parsed) throw new RaffleGateError();

  const gate = await findGateRecord();
  if (!gate) throw new RaffleGateError("RAFFLE_GATE_NOT_CONFIGURED");

  if (gate.passwordUpdatedAt.getTime() !== parsed.version) {
    throw new RaffleGateError();
  }

  return true;
}
