-- Enum values cannot run inside a transaction on PostgreSQL; see migration.toml.
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

ALTER TABLE "RaffleEntry" ADD COLUMN IF NOT EXISTS "adminVisible" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "BlacklistEntry" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT,
    "xHandle" TEXT,
    "raffleId" TEXT NOT NULL,
    "raffleTitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlacklistEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BlacklistEntry_walletAddress_idx" ON "BlacklistEntry"("walletAddress");
CREATE INDEX IF NOT EXISTS "BlacklistEntry_xHandle_idx" ON "BlacklistEntry"("xHandle");

DO $$ BEGIN
  ALTER TABLE "BlacklistEntry"
    ADD CONSTRAINT "BlacklistEntry_raffleId_fkey"
    FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
