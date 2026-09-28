import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { repairRaffleEntriesAfterBlacklistMistake } from "@/lib/raffles/blacklist";

async function authorizeRepair(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth === `Bearer ${secret}`) {
    return true;
  }
  try {
    await requireAdminSession();
    return true;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!(await authorizeRepair(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
