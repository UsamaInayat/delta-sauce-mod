import { EntryStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const REAL_ENTRY_STATUSES: EntryStatus[] = [
  EntryStatus.SUBMITTED,
  EntryStatus.ACCEPTED,
];

export async function isIpAllowedForRealEntry(
  ip: string | null | undefined,
  raffleId: string,
  options?: { excludeEntryId?: string },
) {
  if (!ip) return true;

  const existing = await prisma.raffleEntry.findFirst({
    where: {
      raffleId,
      sourceIp: ip,
      adminVisible: true,
      status: { in: REAL_ENTRY_STATUSES },
      ...(options?.excludeEntryId ? { id: { not: options.excludeEntryId } } : {}),
    },
    select: { id: true },
  });

  return !existing;
}
