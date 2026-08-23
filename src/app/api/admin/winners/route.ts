import { NextResponse } from "next/server";
import { EntryStatus, RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/admin-session";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raffles = await prisma.raffle.findMany({
    where: { status: RaffleStatus.CLOSED },
    orderBy: { closedAt: "desc" },
    include: {
      entries: {
        where: { status: EntryStatus.ACCEPTED },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({
    winners: raffles.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      type: r.type,
      closedAt: r.closedAt,
      winners: r.entries.map((e) => ({
        walletAddress: e.walletAddress,
        walletEns: e.walletEns,
        xHandle: e.xHandle,
      })),
    })),
  });
}
