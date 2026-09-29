export function normalizeDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    if (!url.hostname.includes("neon.tech")) return raw;
    if (!url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
    url.searchParams.delete("channel_binding");
    if (!url.searchParams.has("connect_timeout")) url.searchParams.set("connect_timeout", "30");
    if (!url.searchParams.has("pool_timeout")) url.searchParams.set("pool_timeout", "30");
    return url.toString();
  } catch {
    return raw;
  }
}

/** Prefer Neon-managed URL (auto-synced) over manual DATABASE_URL — same DB, fresher credentials. */
export function resolveDatabaseUrl(): string | undefined {
  const candidates = [
    process.env.DATABASE_POSTGRES_PRISMA_URL,
    process.env.DATABASE_POSTGRES_URL,
    process.env.DATABASE_URL,
    process.env.DATABASE_URL_UNPOOLED,
    process.env.DATABASE_POSTGRES_URL_NON_POOLING,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return normalizeDatabaseUrl(trimmed);
  }

  return undefined;
}
