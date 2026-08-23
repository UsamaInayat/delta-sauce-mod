import { RaffleChain } from "@prisma/client";
import { normalizeWallet } from "@/lib/wallet/validate";

const PROXY =
  process.env.OPENSEA_PROXY_URL ??
  "https://sauce.deltasauceartist.workers.dev";

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

export async function walletHoldsFromCollection(input: {
  wallet: string;
  contractAddress: string;
  chain: RaffleChain;
}): Promise<boolean> {
  const wallet = normalizeWallet(input.wallet);
  const contract = input.contractAddress.toLowerCase();
  const chain = chainPath(input.chain);

  const url = `${PROXY}/chain/${chain}/account/${wallet}/nfts?limit=50`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      nfts?: Array<{ contract?: string }>;
    };
    return (data.nfts ?? []).some(
      (n) => (n.contract ?? "").toLowerCase() === contract,
    );
  } catch {
    return false;
  }
}

export async function walletHoldsAnyCollection(
  wallet: string,
  collections: Array<{ contractAddress: string; chain: RaffleChain }>,
): Promise<{ holds: boolean; matched?: string }> {
  for (const c of collections) {
    const holds = await walletHoldsFromCollection({
      wallet,
      contractAddress: c.contractAddress,
      chain: c.chain,
    });
    if (holds) {
      return { holds: true, matched: c.contractAddress };
    }
  }
  return { holds: false };
}

export async function fetchCollectionHolders(input: {
  contractAddress: string;
  chain: RaffleChain;
  limit?: number;
}): Promise<Array<{ walletAddress: string; balance: number }>> {
  const chain = chainPath(input.chain);
  const contract = input.contractAddress.toLowerCase();
  const limit = input.limit ?? 500;
  const holders = new Map<string, number>();

  let cursor: string | null = null;
  let pages = 0;

  while (pages < 20 && holders.size < limit) {
    const qs = new URLSearchParams({ limit: "50" });
    if (cursor) qs.set("next", cursor);
    const url = `${PROXY}/chain/${chain}/contract/${contract}/nfts?${qs}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) break;
    const data = (await res.json()) as {
      nfts?: Array<{ owners?: Array<{ address?: string }> }>;
      next?: string;
    };
    for (const nft of data.nfts ?? []) {
      for (const owner of nft.owners ?? []) {
        if (!owner.address) continue;
        const w = normalizeWallet(owner.address);
        holders.set(w, (holders.get(w) ?? 0) + 1);
      }
    }
    cursor = data.next ?? null;
    pages += 1;
    if (!cursor) break;
  }

  return Array.from(holders.entries()).map(([walletAddress, balance]) => ({
    walletAddress,
    balance,
  }));
}

export async function fetchOpenseaNft(url: string) {
  const m = url.match(/opensea\.io\/(?:assets|item)\/([^/]+)\/(0x[a-fA-F0-9]{40})\/(\d+)/i);
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
    image:
      nft.display_image_url ??
      nft.image_url ??
      null,
    collection: nft.collection ?? "",
  };
}
