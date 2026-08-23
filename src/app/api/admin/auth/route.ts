import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminSession,
  setAdminSession,
  verifyAdminCredentials,
} from "@/lib/auth/admin-session";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { username?: string; password?: string };
  if (
    !body.username ||
    !body.password ||
    !verifyAdminCredentials(body.username, body.password)
  ) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }
  await setAdminSession(body.username);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
