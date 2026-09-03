import { EntryStatus, RaffleStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireAdminSession();

  const raffles = await prisma.raffle.findMany({
    where: { status: RaffleStatus.CLOSED },
    orderBy: { endsAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      endsAt: true,
    },
  });

  return NextResponse.json({
    rows: raffles.map((raffle) => ({
      id: raffle.id,
      slug: raffle.slug,
      title: raffle.title,
      type: raffle.type,
      endsAt: raffle.endsAt?.toISOString() ?? null,
    })),
  });
}
