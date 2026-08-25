import { RaffleChain } from "@prisma/client";
import { normalizeWallet } from "@/lib/wallet/validate";

const PROXY =
  process.env.OPENSEA_PROXY_URL ??
  "https://sauce.deltasauceartist.workers.dev";

export type EligibleCollection = {
  name: string;
  contractAddress: string;
  chain: RaffleChain;
};

export type WalletHoldResult = {
  holds: boolean;
  verified: boolean;
  matchedContract?: string;
};

type NftRow = {
  contract?: string;
};

function chainPath(chain: RaffleChain) {
  switch (chain) {
    case RaffleChain.ETHEREUM:
      return "ethereum";
    case RaffleChain.BASE:
      return "base";
    case RaffleChain.POLYGON:
      return "polygon";
    case RaffleChain.ARBITRUM:
      return "arbitrum";
    case RaffleChain.OPTIMISM:
      return "optimism";
    default:
      return "ethereum";
  }
}

function normalizeContract(address: string) {
  return address.trim().toLowerCase();
}

function nftMatchesContract(nft: NftRow, contract: string) {
  return normalizeContract(nft.contract ?? "") === contract;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function proxyFetch<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchWalletNftPage(input: {
  chain: string;
  wallet: string;
  cursor?: string | null;
}) {
  const qs = new URLSearchParams({ limit: "50" });
  if (input.cursor) qs.set("next", input.cursor);

  const url = `${PROXY}/chain/${input.chain}/account/${input.wallet}/nfts?${qs}`;
  return proxyFetch<{ nfts?: NftRow[]; next?: string }>(url);
}

export async function walletHoldsFromCollection(input: {
  wallet: string;
  contractAddress: string;
  chain: RaffleChain;
  retries?: number;
}): Promise<WalletHoldResult> {
  const wallet = normalizeWallet(input.wallet);
  const contract = normalizeContract(input.contractAddress);
  const chain = chainPath(input.chain);
  const retries = input.retries ?? 2;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let cursor: string | null = null;
    let sawSuccessfulPage = false;

    for (let page = 0; page < 40; page++) {
      const data = await fetchWalletNftPage({ chain, wallet, cursor });
      if (!data) break;

      sawSuccessfulPage = true;
      const nfts = data.nfts ?? [];
      if (nfts.some((nft) => nftMatchesContract(nft, contract))) {
        return { holds: true, verified: true, matchedContract: contract };
      }

      cursor = data.next ?? null;
      if (!cursor) {
        return { holds: false, verified: true };
      }
    }

    if (sawSuccessfulPage) {
      return { holds: false, verified: true };
    }

    if (attempt < retries) {
      await sleep(350 * (attempt + 1));
    }
  }

  return { holds: false, verified: false };
}

export async function walletHoldsAnyCollection(
  wallet: string,
  collections: EligibleCollection[],
  options?: { retries?: number },
): Promise<WalletHoldResult> {
  if (!collections.length) {
    return { holds: false, verified: true };
  }

  let sawVerifiedMiss = false;
  for (const collection of collections) {
    const result = await walletHoldsFromCollection({
      wallet,
      contractAddress: collection.contractAddress,
      chain: collection.chain,
      retries: options?.retries,
    });

    if (result.holds) {
      return {
        holds: true,
        verified: true,
        matchedContract: result.matchedContract ?? collection.contractAddress,
      };
    }

    if (result.verified) {
      sawVerifiedMiss = true;
      continue;
    }

    return { holds: false, verified: false };
  }

  return {
    holds: false,
    verified: sawVerifiedMiss,
  };
}

type NftListItem = { identifier?: string };
type OwnerRow = { address?: string; quantity?: number };

async function fetchNftOwners(input: {
  chain: string;
  contract: string;
  identifier: string;
}): Promise<OwnerRow[]> {
  const url = `${PROXY}/chain/${input.chain}/contract/${input.contract}/nfts/${encodeURIComponent(input.identifier)}/owners`;
  const data = await proxyFetch<{ owners?: OwnerRow[] }>(url);
  return data?.owners ?? [];
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, worker),
  );
}

export async function fetchCollectionHolders(input: {
  contractAddress: string;
  chain: RaffleChain;
  limit?: number;
}): Promise<Array<{ walletAddress: string; balance: number }>> {
  const chain = chainPath(input.chain);
  const contract = normalizeContract(input.contractAddress);
  const maxTokens = input.limit ?? 500;
  const holders = new Map<string, number>();

  let cursor: string | null = null;
  let pages = 0;
  let tokensProcessed = 0;

  while (pages < 40 && tokensProcessed < maxTokens) {
    const qs = new URLSearchParams({ limit: "50" });
    if (cursor) qs.set("next", cursor);

    const listUrl = `${PROXY}/chain/${chain}/contract/${contract}/nfts?${qs}`;
    const data = await proxyFetch<{
      nfts?: NftListItem[];
      next?: string;
    }>(listUrl);

    if (!data?.nfts?.length) break;

    const batch = data.nfts.slice(0, maxTokens - tokensProcessed);
    tokensProcessed += batch.length;

    await mapPool(batch, 8, async (nft) => {
      if (!nft.identifier) return;
      const owners = await fetchNftOwners({
        chain,
        contract,
        identifier: nft.identifier,
      });
      for (const owner of owners) {
        if (!owner.address) continue;
        const w = normalizeWallet(owner.address);
        const qty = Math.max(1, owner.quantity ?? 1);
        holders.set(w, (holders.get(w) ?? 0) + qty);
      }
    });

    cursor = data.next ?? null;
    pages += 1;
    if (!cursor) break;
  }

  return Array.from(holders.entries())
    .map(([walletAddress, balance]) => ({ walletAddress, balance }))
    .sort((a, b) => b.balance - a.balance);
}

export async function fetchOpenseaNft(url: string) {
  const m = url.match(
    /opensea\.io\/(?:assets|item)\/([^/]+)\/(0x[a-fA-F0-9]{40})\/(\d+)/i,
  );
  if (!m) throw new Error("Invalid OpenSea URL");
  const [, chain, contract, tokenId] = m;
  const res = await fetch(
    `${PROXY}/chain/${chain}/contract/${contract}/nfts/${tokenId}`,
    { headers: { Accept: "application/json" } },
  );
  if (!res.ok) throw new Error("Could not fetch artwork from OpenSea");
  const data = (await res.json()) as {
    nft?: {
      name?: string;
      image_url?: string;
      display_image_url?: string;
      collection?: string;
    };
  };
  const nft = data.nft;
  if (!nft) throw new Error("NFT not found");
  return {
    name: nft.name ?? "Untitled",
    image: nft.display_image_url ?? nft.image_url ?? null,
    collection: nft.collection ?? "",
  };
}
