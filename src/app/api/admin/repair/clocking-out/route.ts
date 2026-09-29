import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { recoverClockingOutGiveaway } from "@/lib/raffles/clocking-out-recovery";

export async function POST() {
  await requireAdminSession();

  try {
    const result = await recoverClockingOutGiveaway();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Repair failed" },
      { status: 400 },
    );
  }
}
