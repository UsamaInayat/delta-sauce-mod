-- CreateEnum
CREATE TYPE "RaffleType" AS ENUM ('LUCKY_DRAW', 'FCFS', 'WALLET_COLLECTION', 'ARTWORK_GIVEAWAY');

-- CreateEnum
CREATE TYPE "RaffleChain" AS ENUM ('ETHEREUM', 'BASE', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'BITCOIN', 'SOLANA', 'XTZ');

-- CreateEnum
CREATE TYPE "RaffleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXCLUDED');

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "chain" "RaffleChain" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSnapshot" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "raffleId" TEXT,

    CONSTRAINT "CollectionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnapshotHolder" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SnapshotHolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Raffle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "phase" TEXT,
    "artist" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "type" "RaffleType" NOT NULL DEFAULT 'LUCKY_DRAW',
    "status" "RaffleStatus" NOT NULL DEFAULT 'DRAFT',
    "chain" "RaffleChain" NOT NULL DEFAULT 'ETHEREUM',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "winnerCount" INTEGER,
    "spotCap" INTEGER,
    "autoFinalize" BOOLEAN NOT NULL DEFAULT true,
    "tokenGated" BOOLEAN NOT NULL DEFAULT false,
    "liveSnapshotAt" TIMESTAMP(3),
    "itemName" TEXT,
    "openseaUrl" TEXT,
    "artworkImage" TEXT,
    "artworkCollection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Raffle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaffleCollection" (
    "raffleId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,

    CONSTRAINT "RaffleCollection_pkey" PRIMARY KEY ("raffleId","collectionId")
);

-- CreateTable
CREATE TABLE "RaffleEntry" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletEns" TEXT,
    "xHandle" TEXT NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_contractAddress_chain_key" ON "Collection"("contractAddress", "chain");

-- CreateIndex
CREATE INDEX "CollectionSnapshot_collectionId_takenAt_idx" ON "CollectionSnapshot"("collectionId", "takenAt");

-- CreateIndex
CREATE INDEX "SnapshotHolder_snapshotId_walletAddress_idx" ON "SnapshotHolder"("snapshotId", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Raffle_slug_key" ON "Raffle"("slug");

-- CreateIndex
CREATE INDEX "RaffleEntry_raffleId_status_idx" ON "RaffleEntry"("raffleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleEntry_raffleId_walletAddress_key" ON "RaffleEntry"("raffleId", "walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "RaffleEntry_raffleId_xHandle_key" ON "RaffleEntry"("raffleId", "xHandle");

-- AddForeignKey
ALTER TABLE "CollectionSnapshot" ADD CONSTRAINT "CollectionSnapshot_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSnapshot" ADD CONSTRAINT "CollectionSnapshot_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnapshotHolder" ADD CONSTRAINT "SnapshotHolder_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CollectionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleCollection" ADD CONSTRAINT "RaffleCollection_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleCollection" ADD CONSTRAINT "RaffleCollection_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaffleEntry" ADD CONSTRAINT "RaffleEntry_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
