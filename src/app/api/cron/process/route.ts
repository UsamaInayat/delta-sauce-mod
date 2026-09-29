import { NextResponse } from "next/server";
import {
  hasActiveRaffleCronWork,
  processDueRaffles,
} from "@/lib/raffles/process-due";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveRaffleCronWork())) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_active_raffles" });
  }

  await processDueRaffles();
  return NextResponse.json({ ok: true });
}
