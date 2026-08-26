import { NextResponse } from "next/server";
import { enforceRaffleGateApi } from "@/lib/auth/gate-api";
import { listPublicRaffleFolders } from "@/lib/raffles/public-folders";

export const dynamic = "force-dynamic";

export async function GET() {
  const gateResponse = await enforceRaffleGateApi();
  if (gateResponse) return gateResponse;

  const folders = await listPublicRaffleFolders();

  return NextResponse.json(
    { folders },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
