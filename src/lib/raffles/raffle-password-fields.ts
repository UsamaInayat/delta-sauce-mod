import { encryptGatePassword } from "@/lib/auth/gate-crypto";

export function buildRafflePasswordUpdate(
  body: Record<string, unknown>,
  hasExistingPassword: boolean,
) {
  const passwordProtected = Boolean(body.passwordProtected);
  const password = String(body.password ?? "").trim();

  if (!passwordProtected) {
    return {
      passwordProtected: false,
      passwordEnc: null,
      passwordUpdatedAt: null,
    };
  }

  if (password) {
    return {
      passwordProtected: true,
      passwordEnc: encryptGatePassword(password),
      passwordUpdatedAt: new Date(),
    };
  }

  if (hasExistingPassword) {
    return { passwordProtected: true };
  }

  return { passwordProtected: true };
}

export function validatePasswordProtectedForPublish(
  passwordProtected: boolean,
  passwordEnc: string | null,
) {
  if (passwordProtected && !passwordEnc) {
    return "Set a password before publishing this raffle.";
  }
  return null;
}
