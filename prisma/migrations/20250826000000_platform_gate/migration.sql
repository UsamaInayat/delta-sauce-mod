-- CreateTable
CREATE TABLE "PlatformGate" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "passwordEnc" TEXT NOT NULL,
    "passwordUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformGate_pkey" PRIMARY KEY ("id")
);
