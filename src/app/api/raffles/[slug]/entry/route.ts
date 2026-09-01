import { NextRequest, NextResponse } from "next/server";
import { enforceRaffleGateApi } from "@/lib/auth/gate-api";
import { enforceRafflePasswordApi } from "@/lib/auth/raffle-password";
import { prisma } from "@/lib/prisma";
import { cancelEntry, getDrawWinChance, submitEntry } from "@/lib/raffles/entry";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const gateResponse = await enforceRaffleGateApi();
  if (gateResponse) return gateResponse;

  const { slug } = await ctx.params;
  const body = await req.json();

  const raffle = await prisma.raffle.findFirst({ where: { slug } });
  if (!raffle) {
    return NextResponse.json({ error: "Raffle not found" }, { status: 404 });
  }

  const passwordResponse = await enforceRafflePasswordApi(raffle, slug);
  if (passwordResponse) return passwordResponse;

  try {
    const entry = await submitEntry({
      raffleId: raffle.id,
      walletInput: String(body.wallet ?? ""),
      xHandle: String(body.xHandle ?? ""),
    });
    const winChance = await getDrawWinChance(raffle);
    return NextResponse.json({ entry, winChance });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Entry failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const gateResponse = await enforceRaffleGateApi();
  if (gateResponse) return gateResponse;

  const { slug } = await ctx.params;
  const body = await req.json();

  const raffle = await prisma.raffle.findFirst({ where: { slug } });
  if (!raffle) {
    return NextResponse.json({ error: "Raffle not found" }, { status: 404 });
  }

  const passwordResponse = await enforceRafflePasswordApi(raffle, slug);
  if (passwordResponse) return passwordResponse;

  try {
    const entry = await cancelEntry({
      raffleId: raffle.id,
      walletInput: String(body.wallet ?? ""),
    });
    return NextResponse.json({ entry });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cancel failed" },
      { status: 400 },
    );
  }
}
