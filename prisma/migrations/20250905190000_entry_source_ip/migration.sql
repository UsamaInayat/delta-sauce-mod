ALTER TABLE "RaffleEntry" ADD COLUMN IF NOT EXISTS "sourceIp" TEXT;

CREATE INDEX IF NOT EXISTS "RaffleEntry_sourceIp_adminVisible_idx" ON "RaffleEntry"("sourceIp", "adminVisible");
