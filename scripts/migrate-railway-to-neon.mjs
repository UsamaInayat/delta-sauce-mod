/**
 * Copy all app data from Railway Postgres to Neon.
 *
 * Usage:
 *   $env:RAILWAY_DATABASE_URL = "postgresql://..."   # Railway public TCP URL
 *   $env:NEON_DATABASE_URL     = "postgresql://..."   # Neon direct (unpooled) URL
 *   node scripts/migrate-railway-to-neon.mjs
 */

import pg from "pg";

const { Client } = pg;

const SOURCE = process.env.RAILWAY_DATABASE_URL;
const TARGET = process.env.NEON_DATABASE_URL;

const TABLES = [
  "Collection",
  "PlatformGate",
  "Raffle",
  "CollectionSnapshot",
  "SnapshotHolder",
  "RaffleCollection",
  "RaffleEntry",
];

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing ${name}. Set it before running this script.`);
    process.exit(1);
  }
}

function clientOpts(url) {
  return {
    connectionString: url,
    ssl: url.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 30_000,
    keepAlive: true,
  };
}

async function countRows(client, table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS c FROM "${table}"`);
  return rows[0].c;
}

async function fetchAll(source) {
  const data = {};
  for (const table of TABLES) {
    const { rows } = await source.query(`SELECT * FROM "${table}"`);
    data[table] = rows;
    console.info(`  ${table}: ${rows.length} rows fetched`);
  }
  return data;
}

async function insertTable(target, table, rows) {
  if (rows.length === 0) {
    console.info(`  ${table}: 0 rows (skip)`);
    return 0;
  }

  const columns = Object.keys(rows[0]);
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const batchSize = 100;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const rowPlaceholders = batch
      .map((row, rowIndex) => {
        const offset = rowIndex * columns.length;
        values.push(...columns.map((c) => row[c]));
        const slots = columns.map((_, colIndex) => `$${offset + colIndex + 1}`);
        return `(${slots.join(", ")})`;
      })
      .join(", ");

    await target.query(
      `INSERT INTO "${table}" (${colList}) VALUES ${rowPlaceholders}`,
      values,
    );
  }

  console.info(`  ${table}: ${rows.length} rows inserted`);
  return rows.length;
}

async function main() {
  requireEnv("RAILWAY_DATABASE_URL", SOURCE);
  requireEnv("NEON_DATABASE_URL", TARGET);

  console.info("[migrate] reading from Railway…");
  const source = new Client(clientOpts(SOURCE));
  await source.connect();
  const data = await fetchAll(source);
  await source.end();

  console.info("[migrate] writing to Neon…");
  const target = new Client(clientOpts(TARGET));
  await target.connect();

  await target.query(`
    TRUNCATE TABLE
      "RaffleEntry",
      "RaffleCollection",
      "SnapshotHolder",
      "CollectionSnapshot",
      "Raffle",
      "PlatformGate",
      "Collection"
    RESTART IDENTITY CASCADE
  `);

  let total = 0;
  for (const table of TABLES) {
    total += await insertTable(target, table, data[table]);
  }

  console.info("[migrate] target counts:");
  for (const table of TABLES) {
    const n = await countRows(target, table);
    console.info(`  ${table}: ${n}`);
  }

  await target.end();
  console.info(`[migrate] done — ${total} rows copied`);
}

main().catch((err) => {
  console.error("[migrate] failed:", err.message);
  process.exit(1);
});
