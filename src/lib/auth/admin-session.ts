import { cookies } from "next/headers";
import {
  createAdminToken,
  MAX_AGE,
  verifyAdminToken,
} from "@/lib/auth/admin-token";

const COOKIE = "ds_admin_session";

export { verifyAdminToken };

export async function setAdminSession(username: string) {
  const token = createAdminToken(username);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function clearAdminSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getAdminSession(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function requireAdminSession() {
  const user = await getAdminSession();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function verifyAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME ?? "sauce";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "letthesauceflow";
  return username === expectedUser && password === expectedPass;
}
