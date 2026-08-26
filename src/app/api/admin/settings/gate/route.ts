import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/prisma";
import { decryptGatePassword } from "@/lib/auth/gate-crypto";
import { updatePlatformGateSettings } from "@/lib/auth/raffle-gate";

export async function GET() {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gate = await prisma.platformGate.findUnique({ where: { id: "default" } });
  if (!gate) {
    return NextResponse.json({
      enabled: false,
      configured: false,
      password: "",
      updatedAt: null,
    });
  }

  return NextResponse.json({
    enabled: gate.enabled,
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
  const enabled =
    body.enabled === undefined ? undefined : Boolean(body.enabled);
  const password =
    body.password === undefined ? undefined : String(body.password).trim();

  if (enabled === undefined && password === undefined) {
    return NextResponse.json({ error: "No changes to save." }, { status: 400 });
  }

  if (enabled === true && password === "") {
    return NextResponse.json(
      { error: "Password is required when platform password is enabled." },
      { status: 400 },
    );
  }

  try {
    const gate = await updatePlatformGateSettings({ enabled, password });
    if (!gate) {
      return NextResponse.json({
        enabled: false,
        configured: false,
        password: "",
        updatedAt: null,
      });
    }

    return NextResponse.json({
      enabled: gate.enabled,
      configured: true,
      password: decryptGatePassword(gate.passwordEnc) ?? "",
      updatedAt: gate.passwordUpdatedAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed." },
      { status: 400 },
    );
  }
}
