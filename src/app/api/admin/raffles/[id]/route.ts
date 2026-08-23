import { NextRequest, NextResponse } from "next/server";
import { RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { parseDateTimeLocalValue } from "@/lib/datetime/local-input";
import { takeRaffleLiveSnapshots } from "@/lib/raffles/finalize";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json();

  const raffle = await prisma.raffle.update({
    where: { id },
    data: {
      title: body.title,
      phase: body.phase,
      artist: body.artist,
      description: body.description,
      type: body.type,
      chain: body.chain,
      startsAt: body.startsAt
        ? parseDateTimeLocalValue(body.startsAt)
        : undefined,
      endsAt: body.endsAt ? parseDateTimeLocalValue(body.endsAt) : undefined,
      winnerCount: body.winnerCount != null ? Number(body.winnerCount) : undefined,
      spotCap: body.spotCap != null ? Number(body.spotCap) : undefined,
      autoFinalize: body.autoFinalize,
      tokenGated: body.tokenGated,
      itemName: body.itemName,
      openseaUrl: body.openseaUrl,
      artworkCollection: body.artworkCollection,
    },
  });

  if (Array.isArray(body.collectionIds)) {
    await prisma.raffleCollection.deleteMany({ where: { raffleId: id } });
    if (body.collectionIds.length) {
      await prisma.raffleCollection.createMany({
        data: body.collectionIds.map((collectionId: string) => ({
          raffleId: id,
          collectionId,
        })),
      });
    }
  }

  return NextResponse.json({ raffle });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = await req.json();
  const action = body.action as string;

  if (action === "publish") {
    const raffle = await prisma.raffle.update({
      where: { id },
      data: {
        status: RaffleStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    const label = getRaffleLifecycleLabel(raffle);
    if (label === "LIVE" && raffle.tokenGated) {
      await takeRaffleLiveSnapshots(id);
    }

    return NextResponse.json({ raffle });
  }

  if (action === "finalize") {
    const { finalizeRaffle } = await import("@/lib/raffles/finalize");
    const result = await finalizeRaffle(id);
    return NextResponse.json({ result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
