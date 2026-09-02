import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

if (!process.env.DATABASE_URL) {
  console.error("[start] DATABASE_URL is not set. Link Postgres to this service.");
  process.exit(1);
}

console.info("[start] applying database migrations…");
try {
  run("npx prisma migrate deploy");
  console.info("[start] migrations applied");
} catch (error) {
  console.error("[start] migrate deploy failed");
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exit(1);
}

console.info("[start] verifying raffle schema…");
run("node scripts/ensure-raffle-columns.mjs");

console.info("[start] launching Next.js…");
run("next start");
