import { NextResponse } from "next/server";
import { requireRaffleGate, RaffleGateError } from "@/lib/auth/raffle-gate";

export async function enforceRaffleGateApi() {
  try {
    await requireRaffleGate();
    return null;
  } catch (error) {
    if (error instanceof RaffleGateError) {
      if (error.message === "RAFFLE_GATE_NOT_CONFIGURED") {
        return NextResponse.json(
          { error: "Raffle access is not configured." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw error;
  }
}
