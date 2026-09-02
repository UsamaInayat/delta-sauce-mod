import { prisma } from "@/lib/prisma";

let ensured = false;
let ensuring: Promise<void> | null = null;

export async function ensureRaffleSchema() {
  if (ensured) return;
  if (ensuring) return ensuring;

  ensuring = (async () => {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "artistXUrl" TEXT;
      ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "mintPrice" TEXT;
      ALTER TABLE "Raffle" ADD COLUMN IF NOT EXISTS "supply" TEXT;
    `);
    ensured = true;
  })();

  try {
    await ensuring;
  } finally {
    ensuring = null;
  }
}
