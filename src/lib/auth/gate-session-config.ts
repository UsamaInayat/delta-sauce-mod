/** Signed token validity while the browser session cookie exists (12h cap). */
export const GATE_SESSION_TTL_SEC = 60 * 60 * 12;

export function gateSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // No maxAge → session cookie; cleared when the browser closes.
  };
}
