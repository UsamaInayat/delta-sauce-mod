const ENS_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.(eth|xyz|box|art|id)$/i;

const WALLET_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function isEns(value: string) {
  return ENS_PATTERN.test(value.trim());
}

export function isValidWalletOrEns(value: string) {
  const v = value.trim();
  return WALLET_PATTERN.test(v) || isEns(v);
}

export function normalizeWallet(address: string) {
  return address.trim().toLowerCase();
}

export function normalizeXHandle(value: string) {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function isValidXHandle(value: string) {
  const v = normalizeXHandle(value);
  return /^[a-z0-9_]{1,15}$/i.test(v);
}

export async function resolveEns(name: string): Promise<string | null> {
  const base =
    process.env.ENS_RESOLVE_URL ??
    "https://api.ensideas.com/ens/resolve";
  try {
    const res = await fetch(`${base}/${encodeURIComponent(name.trim())}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { name?: string; address?: string };
    return data.address ? normalizeWallet(data.address) : null;
  } catch {
    return null;
  }
}

export async function resolveWalletInput(input: string): Promise<{
  address: string;
  ens: string | null;
}> {
  const trimmed = input.trim();
  if (WALLET_PATTERN.test(trimmed)) {
    return { address: normalizeWallet(trimmed), ens: null };
  }
  if (isEns(trimmed)) {
    const address = await resolveEns(trimmed);
    if (!address) throw new Error("That ENS name does not resolve to an address.");
    return { address, ens: trimmed.toLowerCase() };
  }
  throw new Error("Enter a valid ETH address (0x…) or ENS name.");
}
