import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

if (!process.env.DATABASE_URL) {
  console.error("[start] DATABASE_URL is not set. Link Postgres to this service.");
  process.exit(1);
}

console.info("[start] syncing database schema…");
try {
  run("npx prisma migrate deploy");
  console.info("[start] migrations applied");
} catch {
  console.warn("[start] migrate deploy failed — trying db push…");
  run("npx prisma db push --skip-generate");
  console.info("[start] schema pushed");
}

console.info("[start] launching Next.js…");
run("next start");
