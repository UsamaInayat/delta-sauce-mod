/**
 * Finalize a published draw/collection raffle that has ended.
 *
 * Usage: npx tsx scripts/finalize-raffle-slug.ts clocking-out
 */
import { prisma } from "../src/lib/prisma";
import { finalizeRaffle } from "../src/lib/raffles/finalize";
import { getRaffleLifecycleLabel } from "../src/lib/raffles/lifecycle";

const slug = process.argv[2]?.trim();
if (!slug) {
  console.error("Usage: npx tsx scripts/finalize-raffle-slug.ts <slug>");
  process.exit(1);
}

const raffle = await prisma.raffle.findUnique({ where: { slug } });
if (!raffle) {
  console.error(`Raffle not found: ${slug}`);
  process.exit(1);
}

const lifecycle = getRaffleLifecycleLabel(raffle);
console.log(JSON.stringify({ slug, lifecycle, status: raffle.status }, null, 2));

if (lifecycle !== "ENDED" && lifecycle !== "LIVE") {
  console.error("Raffle is not ready to finalize (must be LIVE or ENDED).");
  process.exit(1);
}

const result = await finalizeRaffle(raffle.id);
console.log(JSON.stringify({ ok: true, ...result }, null, 2));
await prisma.$disconnect();
