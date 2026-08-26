import { NextResponse } from "next/server";
import { enforceRaffleGateApi } from "@/lib/auth/gate-api";
import { clearRafflePasswordSession } from "@/lib/auth/raffle-password";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, context: RouteContext) {
  const gateResponse = await enforceRaffleGateApi();
  if (gateResponse) return gateResponse;

  const { slug } = await context.params;
  const raffle = await prisma.raffle.findUnique({ where: { slug } });
  if (!raffle) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await clearRafflePasswordSession(slug);
  return NextResponse.json({ ok: true });
}
