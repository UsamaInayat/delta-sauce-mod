import { NextRequest, NextResponse } from "next/server";
import { RaffleStatus, RaffleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { parseStoredDateTime } from "@/lib/datetime/local-input";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

function parseOptionalDate(value: unknown) {
  return parseStoredDateTime(value);
}

function buildUpdateData(body: Record<string, unknown>) {
  const isArtwork = body.type === RaffleType.ARTWORK_GIVEAWAY;
  const title = isArtwork
    ? String(body.itemName ?? body.title ?? "").trim()
    : String(body.title ?? "").trim();

  return {
    title: title || undefined,
    phase: isArtwork ? null : (body.phase as string | null | undefined) ?? null,
    artist: isArtwork ? null : (body.artist as string | null | undefined) ?? null,
    description: isArtwork ? "" : String(body.description ?? ""),
    type: body.type as RaffleType | undefined,
    chain: body.chain as import("@prisma/client").RaffleChain | undefined,
    startsAt: parseOptionalDate(body.startsAt),
    endsAt: parseOptionalDate(body.endsAt),
    winnerCount:
      body.winnerCount != null && body.winnerCount !== ""
        ? Number(body.winnerCount)
        : null,
    spotCap:
      body.spotCap != null && body.spotCap !== ""
        ? Number(body.spotCap)
        : null,
    autoFinalize: body.autoFinalize !== false,
    tokenGated: Boolean(body.tokenGated),
    itemName: (body.itemName as string | null | undefined) ?? null,
    openseaUrl: (body.openseaUrl as string | null | undefined) ?? null,
    artworkCollection:
      (body.artworkCollection as string | null | undefined) ?? null,
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const raffle = await prisma.raffle.findUnique({
    where: { id },
    include: {
      collections: { include: { collection: true } },
      _count: { select: { entries: true } },
    },
  });

  if (!raffle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    raffle: {
      ...raffle,
      lifecycle: getRaffleLifecycleLabel(raffle),
    },
  });
}

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

  if (body.startsAt && parseOptionalDate(body.startsAt) == null) {
    return NextResponse.json({ error: "Invalid starts at time" }, { status: 400 });
  }
  if (body.endsAt && parseOptionalDate(body.endsAt) == null) {
    return NextResponse.json({ error: "Invalid ends at time" }, { status: 400 });
  }

  await prisma.raffle.update({
    where: { id },
    data: buildUpdateData(body),
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

  const raffle = await prisma.raffle.findUnique({
    where: { id },
    include: {
      collections: { include: { collection: true } },
      _count: { select: { entries: true } },
    },
  });

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
    const existing = await prisma.raffle.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const raffle = await prisma.raffle.update({
      where: { id },
      data: {
        status: RaffleStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    const full = await prisma.raffle.findUnique({
      where: { id },
      include: {
        collections: { include: { collection: true } },
        _count: { select: { entries: true } },
      },
    });

    return NextResponse.json({ raffle: full });
  }

  if (action === "finalize") {
    const { finalizeRaffle } = await import("@/lib/raffles/finalize");
    const result = await finalizeRaffle(id);
    return NextResponse.json({ result });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const raffle = await prisma.raffle.findUnique({ where: { id } });

  if (!raffle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (raffle.status !== RaffleStatus.DRAFT) {
    return NextResponse.json(
      { error: "Only draft raffles can be deleted" },
      { status: 400 },
    );
  }

  await prisma.raffle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
