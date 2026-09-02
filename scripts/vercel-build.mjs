import { execSync } from "node:child_process";

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

run("npx prisma generate");

if (process.env.DATABASE_URL) {
  console.info("[build] applying database migrations…");
  try {
    run("npx prisma migrate deploy");
    run("node scripts/ensure-raffle-columns.mjs");
    console.info("[build] database schema ready");
  } catch (error) {
    console.warn("[build] migration step failed; runtime startup will retry");
    if (error instanceof Error && error.message) {
      console.warn(error.message);
    }
  }
} else {
  console.warn("[build] DATABASE_URL not set; skipping migrations");
}

run("next build");
