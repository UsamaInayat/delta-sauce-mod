const X_PROFILE_HOSTS = new Set(["x.com", "twitter.com", "www.x.com", "www.twitter.com"]);

export function isValidXProfileUrl(value: string) {
  return normalizeXProfileUrl(value) != null;
}

export function normalizeXProfileUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^@?[a-z0-9_]{1,15}$/i.test(trimmed)) {
    const handle = trimmed.replace(/^@+/, "").toLowerCase();
    return `https://x.com/${handle}`;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (!X_PROFILE_HOSTS.has(url.hostname.toLowerCase())) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 1) return null;

    const handle = segments[0].replace(/^@+/, "").toLowerCase();
    if (!/^[a-z0-9_]{1,15}$/i.test(handle)) return null;
    if (handle === "intent" || handle === "share" || handle === "home") return null;

    return `https://x.com/${handle}`;
  } catch {
    return null;
  }
}
