import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "artistXUrl" TEXT;
    ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "mintPrice" TEXT;
    ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "supply" TEXT;
  `);
  console.info("[schema] raffle columns verified");
} catch (error) {
  console.error("[schema] failed to verify raffle columns");
  if (error instanceof Error) console.error(error.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
