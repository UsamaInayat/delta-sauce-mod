import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRaffleGateUnlocked } from "@/lib/auth/raffle-gate";

export async function GET() {
  const configured = Boolean(
    await prisma.platformGate.findUnique({ where: { id: "default" } }),
  );
  const unlocked = configured ? await isRaffleGateUnlocked() : false;

  return NextResponse.json({ configured, unlocked });
}
