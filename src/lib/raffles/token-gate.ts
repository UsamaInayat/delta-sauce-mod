import type { EligibleCollection } from "@/lib/blockchain/holdings";
import {
  walletHoldsAnyCollection,
} from "@/lib/blockchain/holdings";

export function formatEligibleCollectionNames(
  collections: Array<{ name: string }>,
) {
  return collections.map((collection) => collection.name).join(", ");
}

export async function assertWalletEligibleForEntry(
  wallet: string,
  collections: EligibleCollection[],
) {
  if (!collections.length) {
    throw new Error(
      "This raffle is token gated but has no eligible collections configured.",
    );
  }

  const result = await walletHoldsAnyCollection(wallet, collections, {
    retries: 3,
  });

  if (!result.verified) {
    throw new Error(
      "We couldn't verify your wallet holdings right now. Please try again in a moment.",
    );
  }

  if (!result.holds) {
    throw new Error(
      `You don't hold an NFT from one of these collections: ${formatEligibleCollectionNames(collections)}`,
    );
  }

  return result;
}

export async function shouldExcludeNonHolder(
  wallet: string,
  collections: EligibleCollection[],
): Promise<boolean> {
  const first = await walletHoldsAnyCollection(wallet, collections, {
    retries: 2,
  });
  if (first.holds || !first.verified) {
    return false;
  }

  await new Promise((resolve) => setTimeout(resolve, 750));

  const second = await walletHoldsAnyCollection(wallet, collections, {
    retries: 2,
  });
  if (second.holds || !second.verified) {
    return false;
  }

  return true;
}
