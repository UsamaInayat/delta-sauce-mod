import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron/authorize";
import { runMinimalCronMaintenance } from "@/lib/raffles/cron-minimal";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Minimal-cost cron for Vercel + external schedulers.
 *
 * Default: one COUNT query; finalize only if endsAt has passed.
 * Add ?maintenance=1 on a rare schedule (e.g. weekly) for password cleanup.
 */
export async function GET(req: Request) {
  if (!authorizeCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const passwordCleanup = url.searchParams.get("maintenance") === "1";

  const result = await runMinimalCronMaintenance({ passwordCleanup });

  if ("skipped" in result && result.skipped) {
    return NextResponse.json(result);
  }

  return NextResponse.json(result);
}
