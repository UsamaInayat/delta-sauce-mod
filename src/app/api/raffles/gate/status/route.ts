import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRaffleGateUnlocked } from "@/lib/auth/raffle-gate";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await prisma.platformGate.findUnique({ where: { id: "default" } });
  const enabled = Boolean(gate?.enabled);
  const configured = Boolean(gate);
  const unlocked = !enabled || (configured && (await isRaffleGateUnlocked()));

  return NextResponse.json(
    { enabled, configured, unlocked },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
