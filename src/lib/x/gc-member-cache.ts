import { prisma } from "@/lib/prisma";
import { normalizeXHandle } from "@/lib/wallet/validate";

const DEFAULT_CONVERSATION_ID = "2010420839276057016";

type GcMemberCache = {
  handles: Set<string>;
  loadedAt: number;
  snapshotId: string | null;
};

let cache: GcMemberCache = {
  handles: new Set(),
  loadedAt: 0,
  snapshotId: null,
};

export function isGcMemberCached(xHandle: string) {
  const handle = normalizeXHandle(xHandle);
  if (!handle) return false;
  return cache.handles.has(handle);
}

export function getGcMemberCacheStats() {
  return {
    memberCount: cache.handles.size,
    loadedAt: cache.loadedAt ? new Date(cache.loadedAt).toISOString() : null,
    snapshotId: cache.snapshotId,
    ready: cache.handles.size > 0,
  };
}

export async function refreshGcMemberCacheFromDb() {
  const snapshot = await prisma.groupChatSnapshot.findFirst({
    orderBy: { takenAt: "desc" },
    include: { members: true },
  });

  if (!snapshot) {
    cache = { handles: new Set(), loadedAt: Date.now(), snapshotId: null };
    return cache;
  }

  cache = {
    handles: new Set(snapshot.members.map((member) => normalizeXHandle(member.xHandle))),
    loadedAt: Date.now(),
    snapshotId: snapshot.id,
  };

  return cache;
}

export async function importGroupChatSnapshot(handles: string[]) {
  const uniqueHandles = [
    ...new Set(handles.map((handle) => normalizeXHandle(handle)).filter(Boolean)),
  ];

  if (!uniqueHandles.length) {
    throw new Error("No valid members to import.");
  }

  const snapshot = await prisma.groupChatSnapshot.create({
    data: {
      conversationId: DEFAULT_CONVERSATION_ID,
      memberCount: uniqueHandles.length,
      members: {
        create: uniqueHandles.map((xHandle) => ({ xHandle })),
      },
    },
    include: { members: true },
  });

  cache = {
    handles: new Set(uniqueHandles),
    loadedAt: Date.now(),
    snapshotId: snapshot.id,
  };

  return snapshot;
}

export async function getLatestGroupChatSnapshot() {
  return prisma.groupChatSnapshot.findFirst({
    orderBy: { takenAt: "desc" },
    include: {
      members: {
        orderBy: { xHandle: "asc" },
      },
    },
  });
}
