-- Password-protected raffles with dictionary word pool
ALTER TABLE "Raffle" ADD COLUMN "passwordProtected" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Raffle" ADD COLUMN "passwordEnc" TEXT;
ALTER TABLE "Raffle" ADD COLUMN "passwordWordId" TEXT;
ALTER TABLE "Raffle" ADD COLUMN "passwordUpdatedAt" TIMESTAMP(3);

CREATE TABLE "RafflePasswordWord" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RafflePasswordWord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RafflePasswordWord_word_key" ON "RafflePasswordWord"("word");
CREATE INDEX "RafflePasswordWord_available_idx" ON "RafflePasswordWord"("available");

ALTER TABLE "Raffle" ADD CONSTRAINT "Raffle_passwordWordId_fkey" FOREIGN KEY ("passwordWordId") REFERENCES "RafflePasswordWord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
