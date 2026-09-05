import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { parseGcMemberCsv } from "@/lib/x/parse-gc-csv";
import {
  getGcMemberCacheStats,
  getLatestGroupChatSnapshot,
  importGroupChatSnapshot,
} from "@/lib/x/gc-member-cache";

function formatSnapshot(snapshot: {
  id: string;
  conversationId: string;
  takenAt: Date;
  memberCount: number;
  members: Array<{ id: string; xHandle: string }>;
}) {
  return {
    id: snapshot.id,
    conversationId: snapshot.conversationId,
    takenAt: snapshot.takenAt.toISOString(),
    memberCount: snapshot.memberCount,
    members: snapshot.members.map((member) => ({
      id: member.id,
      xHandle: member.xHandle,
    })),
  };
}

export async function GET() {
  await requireAdminSession();

  const snapshot = await getLatestGroupChatSnapshot();
  const cache = getGcMemberCacheStats();

  return NextResponse.json({
    snapshot: snapshot ? formatSnapshot(snapshot) : null,
    cache,
  });
}

export async function POST(req: NextRequest) {
  await requireAdminSession();

  try {
    const contentType = req.headers.get("content-type") ?? "";
    let csvText = "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Choose a CSV file to import." }, { status: 400 });
      }
      csvText = await file.text();
    } else {
      const body = await req.json();
      csvText = String(body.csv ?? "");
    }

    const handles = parseGcMemberCsv(csvText);
    const snapshot = await importGroupChatSnapshot(handles);

    return NextResponse.json({ snapshot: formatSnapshot(snapshot) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 400 },
    );
  }
}
