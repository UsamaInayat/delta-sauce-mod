import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyGatePassword } from "@/lib/auth/gate-crypto";
import {
  createRafflePasswordSessionValue,
  rafflePasswordCookieName,
  rafflePasswordSessionCookieOptions,
  verifyRafflePasswordSessionToken,
} from "@/lib/auth/raffle-password-token";
import { prisma } from "@/lib/prisma";
import {
  isRafflePasswordActive,
  type RafflePasswordInput,
} from "@/lib/raffles/lifecycle";

export class RafflePasswordError extends Error {
  constructor(message = "RAFFLE_PASSWORD_REQUIRED") {
    super(message);
    this.name = "RafflePasswordError";
  }
}

export async function isRafflePasswordUnlocked(
  raffle: RafflePasswordInput,
  slug: string,
) {
  try {
    await requireRafflePassword(raffle, slug);
    return true;
  } catch {
    return false;
  }
}

export async function requireRafflePassword(
  raffle: RafflePasswordInput,
  slug: string,
) {
  if (!isRafflePasswordActive(raffle)) return true;

  const jar = await cookies();
  const token = jar.get(rafflePasswordCookieName(slug))?.value;
  if (!token) throw new RafflePasswordError();

  const parsed = verifyRafflePasswordSessionToken(token, slug);
  if (!parsed) throw new RafflePasswordError();

  if (!raffle.passwordUpdatedAt) throw new RafflePasswordError();
  if (raffle.passwordUpdatedAt.getTime() !== parsed.version) {
    throw new RafflePasswordError();
  }

  return true;
}

export async function verifySubmittedRafflePassword(
  raffle: RafflePasswordInput,
  password: string,
) {
  if (!raffle.passwordEnc) {
    throw new RafflePasswordError("RAFFLE_PASSWORD_NOT_CONFIGURED");
  }
  return verifyGatePassword(password, raffle.passwordEnc);
}

export async function enforceRafflePasswordApi(
  raffle: RafflePasswordInput,
  slug: string,
) {
  if (!isRafflePasswordActive(raffle)) return null;

  try {
    await requireRafflePassword(raffle, slug);
    return null;
  } catch (error) {
    if (error instanceof RafflePasswordError) {
      return NextResponse.json(
        { error: "Unauthorized", code: "RAFFLE_PASSWORD_REQUIRED" },
        { status: 401 },
      );
    }
    throw error;
  }
}

export function setRafflePasswordSessionOnResponse(
  response: NextResponse,
  slug: string,
  passwordUpdatedAt: Date,
) {
  const token = createRafflePasswordSessionValue(
    slug,
    passwordUpdatedAt.getTime(),
  );
  response.cookies.set(
    rafflePasswordCookieName(slug),
    token,
    rafflePasswordSessionCookieOptions(),
  );
  return response;
}

export async function publishPasswordProtectedRaffle(raffleId: string) {
  const { encryptGatePassword } = await import("@/lib/auth/gate-crypto");
  const { assignPasswordWordForRaffle } = await import("@/lib/raffles/password-pool");

  const pick = await assignPasswordWordForRaffle(raffleId);
  const passwordUpdatedAt = new Date();

  await prisma.raffle.update({
    where: { id: raffleId },
    data: {
      passwordEnc: encryptGatePassword(pick.word),
      passwordUpdatedAt,
    },
  });

  return { word: pick.word, passwordUpdatedAt };
}

export function sanitizeRaffleForAdmin<T extends Record<string, unknown>>(raffle: T) {
  const { passwordEnc: _enc, ...rest } = raffle;
  return rest;
}

export function sanitizeRaffleForPublic<T extends Record<string, unknown>>(raffle: T) {
  const {
    passwordEnc: _enc,
    passwordWordId: _wordId,
    passwordUpdatedAt: _updated,
    ...rest
  } = raffle;
  return rest;
}
