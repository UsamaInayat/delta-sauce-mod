import { NextRequest, NextResponse } from "next/server";
import { RaffleStatus, RaffleType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { parseStoredDateTime } from "@/lib/datetime/local-input";
import { fetchOpenseaNft } from "@/lib/blockchain/holdings";
import { sanitizeRaffleForAdmin } from "@/lib/auth/raffle-password";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const raffles = await prisma.raffle.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      collections: { include: { collection: true } },
      _count: { select: { entries: true } },
    },
  });
  return NextResponse.json({
    raffles: raffles.map((raffle) => sanitizeRaffleForAdmin(raffle)),
  });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const type = (body.type as RaffleType) ?? RaffleType.LUCKY_DRAW;
  const title =
    type === RaffleType.ARTWORK_GIVEAWAY
      ? String(body.itemName ?? body.title ?? "").trim()
      : String(body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  let artworkImage = body.artworkImage as string | null;
  let itemName = body.itemName as string | null;

  if (type === RaffleType.ARTWORK_GIVEAWAY && body.openseaUrl) {
    try {
      const nft = await fetchOpenseaNft(String(body.openseaUrl));
      artworkImage = nft.image;
      itemName = itemName ?? nft.name;
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "OpenSea fetch failed" },
        { status: 400 },
      );
    }
  }

  const slugBase = slugify(title);
  let slug = slugBase || `raffle-${Date.now()}`;
  const existing = await prisma.raffle.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const raffle = await prisma.raffle.create({
    data: {
      slug,
      title,
      phase: type === RaffleType.ARTWORK_GIVEAWAY ? null : (body.phase ?? null),
      artist: type === RaffleType.ARTWORK_GIVEAWAY ? null : (body.artist ?? null),
      description:
        type === RaffleType.ARTWORK_GIVEAWAY ? "" : (body.description ?? ""),
      type,
      chain: body.chain ?? "ETHEREUM",
      startsAt: parseStoredDateTime(body.startsAt),
      endsAt: parseStoredDateTime(body.endsAt),
      winnerCount: body.winnerCount ? Number(body.winnerCount) : null,
      spotCap: body.spotCap ? Number(body.spotCap) : null,
      autoFinalize: body.autoFinalize !== false,
      tokenGated: Boolean(body.tokenGated),
      passwordProtected: Boolean(body.passwordProtected),
      itemName,
      openseaUrl: body.openseaUrl ?? null,
      artworkImage,
      artworkCollection: body.artworkCollection ?? null,
      status: RaffleStatus.DRAFT,
    },
  });

  const collectionIds = (body.collectionIds as string[]) ?? [];
  if (collectionIds.length) {
    await prisma.raffleCollection.createMany({
      data: collectionIds.map((collectionId) => ({
        raffleId: raffle.id,
        collectionId,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ raffle });
}
