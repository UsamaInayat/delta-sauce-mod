import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { decryptGatePassword } from "@/lib/auth/gate-crypto";
import { updateGatePassword } from "@/lib/auth/raffle-gate";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await prisma.platformGate.findUnique({ where: { id: "default" } });
  if (!gate) {
    return NextResponse.json({
      configured: false,
      password: "",
      updatedAt: null,
    });
  }

  return NextResponse.json({
    configured: true,
    password: decryptGatePassword(gate.passwordEnc) ?? "",
    updatedAt: gate.passwordUpdatedAt.toISOString(),
  });
}

export async function PUT(req: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const password = String(body.password ?? "").trim();
  if (!password) {
    return NextResponse.json({ error: "Password cannot be empty." }, { status: 400 });
  }

  try {
    const gate = await updateGatePassword(password);
    return NextResponse.json({
      configured: true,
      password,
      updatedAt: gate.passwordUpdatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 400 },
    );
  }
}
