-- AlterTable
ALTER TABLE "PlatformGate" ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT false;

-- Preserve existing platform gate behavior for already-configured deployments
UPDATE "PlatformGate" SET "enabled" = true WHERE "id" = 'default';
