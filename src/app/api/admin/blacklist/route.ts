import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { unblacklistEntries } from "@/lib/raffles/blacklist";

export async function GET() {
  await requireAdminSession();

  const rows = await prisma.blacklistEntry.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    rows: rows.map((row) => ({
      id: row.id,
      walletAddress: row.walletAddress,
      xHandle: row.xHandle,
      raffleTitle: row.raffleTitle,
      raffleId: row.raffleId,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  await requireAdminSession();
  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];

  try {
    const result = await unblacklistEntries(ids);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unblacklist failed" },
      { status: 400 },
    );
  }
}
