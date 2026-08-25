import { EntryStatus, RaffleStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdminSession();

  const raffles = await prisma.raffle.findMany({
    where: { status: RaffleStatus.CLOSED },
    orderBy: { endsAt: "desc" },
    include: {
      entries: {
        where: { status: { not: EntryStatus.CANCELLED } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({
    rows: raffles.map((raffle) => {
      const winners = raffle.entries.filter((e) => e.status === EntryStatus.ACCEPTED);
      const entrants = raffle.entries;

      return {
        id: raffle.id,
        slug: raffle.slug,
        title: raffle.title,
        type: raffle.type,
        endsAt: raffle.endsAt?.toISOString() ?? null,
        winners: winners.map((entry) => ({
          walletAddress: entry.walletAddress,
          walletEns: entry.walletEns,
          xHandle: entry.xHandle,
        })),
        entrants: entrants.map((entry) => ({
          walletAddress: entry.walletAddress,
          walletEns: entry.walletEns,
          xHandle: entry.xHandle,
          status: entry.status,
          createdAt: entry.createdAt.toISOString(),
        })),
      };
    }),
  });
}
