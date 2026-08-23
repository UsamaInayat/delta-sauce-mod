import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/admin-session";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collections = await prisma.collection.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ collections });
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const contractAddress = String(body.contractAddress ?? "").trim().toLowerCase();
  const chain = body.chain ?? "ETHEREUM";

  if (!name || !contractAddress) {
    return NextResponse.json(
      { error: "Name and contract address required" },
      { status: 400 },
    );
  }

  const collection = await prisma.collection.create({
    data: { name, contractAddress, chain },
  });

  return NextResponse.json({ collection });
}
