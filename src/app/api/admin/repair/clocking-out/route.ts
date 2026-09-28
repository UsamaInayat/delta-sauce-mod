import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { repairRaffleEntriesAfterBlacklistMistake } from "@/lib/raffles/blacklist";

export async function POST() {
  await requireAdminSession();

  try {
    const result = await repairRaffleEntriesAfterBlacklistMistake("clocking-out");
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Repair failed" },
      { status: 400 },
    );
  }
}
