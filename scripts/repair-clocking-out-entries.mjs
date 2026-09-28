/**
 * One-off repair: restore entrant rows for clocking-out after mistaken
 * mass-blacklist + global unblacklist (old logic set admin-blacklisted rows to CANCELLED).
 *
 * Usage:
 *   node scripts/repair-clocking-out-entries.mjs           # dry run
 *   node scripts/repair-clocking-out-entries.mjs --apply   # write changes
 */
import { EntryStatus, PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./resolve-database-url.mjs";

const SLUG = "clocking-out";
const apply = process.argv.includes("--apply");

const url = resolveDatabaseUrl();
if (!url) {
  console.error("No database URL in environment.");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url } },
});

function summarize(entries) {
  const byStatus = {};
  for (const e of entries) {
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;
  }
  return byStatus;
}

try {
  const raffle = await prisma.raffle.findUnique({
    where: { slug: SLUG },
    select: { id: true, slug: true, title: true, status: true, type: true },
  });

  if (!raffle) {
    console.error(`Raffle not found: ${SLUG}`);
    process.exit(1);
  }

  const allEntries = await prisma.raffleEntry.findMany({
    where: { raffleId: raffle.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      walletAddress: true,
      xHandle: true,
      status: true,
      adminVisible: true,
      updatedAt: true,
    },
  });

  console.log(JSON.stringify({ raffle, totalEntries: allEntries.length, byStatus: summarize(allEntries) }, null, 2));

  const toRestore = allEntries.filter((e) => e.status === EntryStatus.CANCELLED);

  const stillBlacklisted = allEntries.filter((e) => e.status === EntryStatus.BLACKLISTED);
  if (stillBlacklisted.length) {
    console.log(
      `\nNote: ${stillBlacklisted.length} row(s) still BLACKLISTED — will restore to SUBMITTED as well if --apply.`,
    );
  }

  const repairIds = [
    ...toRestore.map((e) => e.id),
    ...stillBlacklisted.filter((e) => e.adminVisible).map((e) => e.id),
  ];
  const uniqueRepairIds = [...new Set(repairIds)];

  if (!uniqueRepairIds.length) {
    console.log("\nNothing to repair (no CANCELLED or admin-visible BLACKLISTED entries).");
    process.exit(0);
  }

  console.log(`\nWould restore ${uniqueRepairIds.length} entr${uniqueRepairIds.length === 1 ? "y" : "ies"} to SUBMITTED (adminVisible: true).`);
  console.log(
    toRestore
      .slice(0, 20)
      .map((e) => `  CANCELLED ${e.xHandle} ${e.walletAddress.slice(0, 10)}… updated ${e.updatedAt.toISOString()}`)
      .join("\n"),
  );
  if (toRestore.length > 20) console.log(`  … and ${toRestore.length - 20} more CANCELLED`);

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to update the database.");
    process.exit(0);
  }

  const result = await prisma.raffleEntry.updateMany({
    where: { id: { in: uniqueRepairIds } },
    data: {
      status: EntryStatus.SUBMITTED,
      adminVisible: true,
    },
  });

  const after = await prisma.raffleEntry.findMany({
    where: { raffleId: raffle.id },
    select: { status: true },
  });

  console.log(JSON.stringify({ updated: result.count, byStatusAfter: summarize(after) }, null, 2));
} finally {
  await prisma.$disconnect();
}
