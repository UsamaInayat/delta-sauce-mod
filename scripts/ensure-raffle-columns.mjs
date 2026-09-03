import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
    // Migrate deploy is the primary path; this is a build-time fallback.
  }
}

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "artistXUrl" TEXT;
    ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "mintPrice" TEXT;
    ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "supply" TEXT;
  `);

  await ensureEntryStatusEnum();

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "RaffleEntry" ADD COLUMN IF NOT EXISTS "adminVisible" BOOLEAN NOT NULL DEFAULT true;
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

  console.info("[schema] raffle + blacklist schema verified");
} catch (error) {
  console.error("[schema] failed to verify schema");
  if (error instanceof Error) console.error(error.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
