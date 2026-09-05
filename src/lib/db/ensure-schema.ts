import { prisma } from "@/lib/prisma";

let ensured = false;
let ensuring: Promise<void> | null = null;

async function ensureEntryStatusEnum() {
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'EntryStatus' AND e.enumlabel = 'BLACKLISTED'
        ) THEN
          ALTER TYPE "EntryStatus" ADD VALUE 'BLACKLISTED';
        END IF;
      END $$;
    `);
  } catch {
    // Migrate deploy is the primary path; this is a runtime fallback on Vercel.
  }
}

async function ensureBlacklistSchema() {
  await ensureEntryStatusEnum();

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "RaffleEntry" ADD COLUMN IF NOT EXISTS "adminVisible" BOOLEAN NOT NULL DEFAULT true;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "RaffleEntry" ADD COLUMN IF NOT EXISTS "sourceIp" TEXT;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "RaffleEntry_sourceIp_adminVisible_idx" ON "RaffleEntry"("sourceIp", "adminVisible");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "BlacklistEntry" (
      "id" TEXT NOT NULL,
      "walletAddress" TEXT,
      "xHandle" TEXT,
      "raffleId" TEXT NOT NULL,
      "raffleTitle" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BlacklistEntry_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "BlacklistEntry_walletAddress_idx" ON "BlacklistEntry"("walletAddress");
    CREATE INDEX IF NOT EXISTS "BlacklistEntry_xHandle_idx" ON "BlacklistEntry"("xHandle");
  `);

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "BlacklistEntry"
          ADD CONSTRAINT "BlacklistEntry_raffleId_fkey"
          FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  } catch {
    // Constraint already exists.
  }
}

async function ensureGroupChatSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GroupChatSnapshot" (
      "id" TEXT NOT NULL,
      "conversationId" TEXT NOT NULL,
      "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "memberCount" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "GroupChatSnapshot_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "GroupChatMember" (
      "id" TEXT NOT NULL,
      "snapshotId" TEXT NOT NULL,
      "xHandle" TEXT NOT NULL,
      CONSTRAINT "GroupChatMember_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "GroupChatSnapshot_takenAt_idx" ON "GroupChatSnapshot"("takenAt");
    CREATE INDEX IF NOT EXISTS "GroupChatMember_xHandle_idx" ON "GroupChatMember"("xHandle");
    CREATE UNIQUE INDEX IF NOT EXISTS "GroupChatMember_snapshotId_xHandle_key" ON "GroupChatMember"("snapshotId", "xHandle");
  `);

  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        ALTER TABLE "GroupChatMember"
          ADD CONSTRAINT "GroupChatMember_snapshotId_fkey"
          FOREIGN KEY ("snapshotId") REFERENCES "GroupChatSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  } catch {
    // Constraint already exists.
  }
}

export async function ensureRaffleSchema() {
  if (ensured) return;
  if (ensuring) return ensuring;

  ensuring = (async () => {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "artistXUrl" TEXT;
      ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "mintPrice" TEXT;
      ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "supply" TEXT;
    `);
    await ensureBlacklistSchema();
    await ensureGroupChatSchema();
    ensured = true;
  })();

  try {
    await ensuring;
  } finally {
    ensuring = null;
  }
}
