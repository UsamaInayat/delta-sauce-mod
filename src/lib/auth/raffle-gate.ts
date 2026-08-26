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

export async function isPlatformGateEnabled() {
  const gate = await findGateRecord();
  return Boolean(gate?.enabled);
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
      enabled: true,
      passwordEnc: encryptGatePassword(trimmed),
      passwordUpdatedAt: now,
    },
    update: {
      enabled: true,
      passwordEnc: encryptGatePassword(trimmed),
      passwordUpdatedAt: now,
    },
  });
}

export async function updatePlatformGateSettings(input: {
  enabled?: boolean;
  password?: string;
}) {
  const existing = await findGateRecord();
  const now = new Date();

  if (input.enabled === false) {
    if (!existing) return null;
    return prisma.platformGate.update({
      where: { id: GATE_ID },
      data: { enabled: false },
    });
  }

  const nextEnabled = input.enabled ?? existing?.enabled ?? false;
  const passwordProvided = input.password !== undefined;
  const trimmedPassword = input.password?.trim() ?? "";

  if (nextEnabled) {
    const resolvedPassword =
      trimmedPassword ||
      (existing?.passwordEnc ? decryptGatePassword(existing.passwordEnc) : null);
    if (!resolvedPassword) {
      throw new Error("Password is required when platform password is enabled.");
    }

    const passwordUpdate = passwordProvided
      ? {
          passwordEnc: encryptGatePassword(trimmedPassword),
          passwordUpdatedAt: now,
        }
      : {};

    return prisma.platformGate.upsert({
      where: { id: GATE_ID },
      create: {
        id: GATE_ID,
        enabled: true,
        passwordEnc: encryptGatePassword(resolvedPassword),
        passwordUpdatedAt: now,
      },
      update: {
        ...passwordUpdate,
        enabled: true,
      },
    });
  }

  if (passwordProvided && trimmedPassword) {
    throw new Error("Enable platform password before setting a password.");
  }

  return existing;
}

export async function verifySubmittedGatePassword(password: string) {
  const gate = await findGateRecord();
  if (!gate?.enabled) throw new RaffleGateError("RAFFLE_GATE_DISABLED");
  if (!gate) throw new RaffleGateError("RAFFLE_GATE_NOT_CONFIGURED");
  return verifyGatePassword(password, gate.passwordEnc);
}

export async function setRaffleGateSession() {
  const gate = await findGateRecord();
  if (!gate?.enabled) return;
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
  const gate = await findGateRecord();
  if (!gate?.enabled) return true;

  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) throw new RaffleGateError();

  const parsed = verifyGateToken(token);
  if (!parsed) throw new RaffleGateError();

  if (!gate) throw new RaffleGateError("RAFFLE_GATE_NOT_CONFIGURED");

  if (gate.passwordUpdatedAt.getTime() !== parsed.version) {
    throw new RaffleGateError();
  }

  return true;
}
