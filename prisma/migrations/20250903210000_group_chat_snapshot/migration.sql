CREATE TABLE IF NOT EXISTS "GroupChatSnapshot" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GroupChatSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "GroupChatMember" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "xHandle" TEXT NOT NULL,

    CONSTRAINT "GroupChatMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GroupChatSnapshot_takenAt_idx" ON "GroupChatSnapshot"("takenAt");
CREATE INDEX IF NOT EXISTS "GroupChatMember_xHandle_idx" ON "GroupChatMember"("xHandle");
CREATE UNIQUE INDEX IF NOT EXISTS "GroupChatMember_snapshotId_xHandle_key" ON "GroupChatMember"("snapshotId", "xHandle");

DO $$ BEGIN
  ALTER TABLE "GroupChatMember"
    ADD CONSTRAINT "GroupChatMember_snapshotId_fkey"
    FOREIGN KEY ("snapshotId") REFERENCES "GroupChatSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
