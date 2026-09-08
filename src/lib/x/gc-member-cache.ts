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

let loadPromise: Promise<GcMemberCache> | null = null;

export async function ensureGcCacheReady() {
  if (cache.handles.size > 0) return cache;
  if (!loadPromise) {
    loadPromise = refreshGcMemberCacheFromDb().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

/** @deprecated Prefer isGcMemberAllowed — sync cache lookup only. */
export function isGcMemberCached(xHandle: string) {
  const handle = normalizeXHandle(xHandle);
  if (!handle) return false;
  return cache.handles.has(handle);
}

export type GcMembershipResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "invalid handle" | "no snapshot" | "not in snapshot";
    };

export async function getGcMembershipStatus(
  xHandle: string,
): Promise<GcMembershipResult> {
  const handle = normalizeXHandle(xHandle);
  if (!handle) {
    return { allowed: false, reason: "invalid handle" };
  }

  await ensureGcCacheReady();
  if (cache.handles.has(handle)) {
    return { allowed: true };
  }

  const latest = await prisma.groupChatSnapshot.findFirst({
    orderBy: { takenAt: "desc" },
    select: {
      id: true,
      members: {
        where: { xHandle: handle },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!latest) {
    return { allowed: false, reason: "no snapshot" };
  }

  if (latest.members.length > 0) {
    cache.handles.add(handle);
    cache.snapshotId = latest.id;
    return { allowed: true };
  }

  return { allowed: false, reason: "not in snapshot" };
}

export async function isGcMemberAllowed(xHandle: string) {
  const status = await getGcMembershipStatus(xHandle);
  return status.allowed;
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
