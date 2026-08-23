import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { fetchCollectionHolders } from "@/lib/blockchain/holdings";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshots = await prisma.collectionSnapshot.findMany({
    where: { source: "manual" },
    orderBy: { takenAt: "desc" },
    take: 50,
    include: {
      collection: true,
      _count: { select: { holders: true } },
    },
  });

  return NextResponse.json({ snapshots });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const collectionId = String(body.collectionId ?? "");
  if (!collectionId) {
    return NextResponse.json({ error: "collectionId required" }, { status: 400 });
  }

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const holders = await fetchCollectionHolders({
    contractAddress: collection.contractAddress,
    chain: collection.chain,
  });

  const snapshot = await prisma.collectionSnapshot.create({
    data: {
      collectionId: collection.id,
      source: "manual",
    },
  });

  if (holders.length) {
    await prisma.snapshotHolder.createMany({
      data: holders.map((h) => ({
        snapshotId: snapshot.id,
        walletAddress: h.walletAddress,
        balance: h.balance,
      })),
    });
  }

  return NextResponse.json({
    snapshot: {
      id: snapshot.id,
      takenAt: snapshot.takenAt,
      holderCount: holders.length,
    },
    warning:
      holders.length === 0
        ? `No holders found for ${collection.name}. Check the contract address (${collection.contractAddress}) and chain (${collection.chain}).`
        : undefined,
  });
}
