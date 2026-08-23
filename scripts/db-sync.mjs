import { execSync } from "node:child_process";
import { getDirectDatabaseUrl } from "./prepare-db-env.mjs";

const direct = getDirectDatabaseUrl();
if (!direct) {
  console.log("Skipping database sync — no Postgres URL configured.");
  process.exit(0);
}

process.env.DATABASE_URL = direct;

console.log("Applying database schema…");
try {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
} catch {
  console.log("migrate deploy failed, trying db push…");
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: process.env,
  });
}
