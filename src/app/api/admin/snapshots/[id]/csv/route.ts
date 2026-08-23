import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/admin-session";

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
  const snapshot = await prisma.collectionSnapshot.findUnique({
    where: { id },
    include: {
      collection: true,
      holders: { orderBy: { balance: "desc" } },
    },
  });

  if (!snapshot) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const header = "wallet_address,balance\n";
  const rows = snapshot.holders
    .map((h) => `${h.walletAddress},${h.balance}`)
    .join("\n");
  const csv = header + rows;

  const filename = `${snapshot.collection.name.replace(/[^a-z0-9]+/gi, "-")}-${snapshot.takenAt.toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
