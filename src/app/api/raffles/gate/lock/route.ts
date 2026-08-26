import { NextResponse } from "next/server";
import { clearRaffleGateSession } from "@/lib/auth/raffle-gate";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearRaffleGateSession();
  return NextResponse.json({ ok: true });
}
