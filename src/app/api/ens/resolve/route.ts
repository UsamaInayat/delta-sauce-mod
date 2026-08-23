import { NextRequest, NextResponse } from "next/server";
import { resolveEns } from "@/lib/wallet/validate";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  const address = await resolveEns(q);
  if (!address) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ address, name: q });
}
