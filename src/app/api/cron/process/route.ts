import { NextResponse } from "next/server";
import { processDueRaffles } from "@/lib/raffles/finalize";

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await processDueRaffles();
  return NextResponse.json({ ok: true });
}
