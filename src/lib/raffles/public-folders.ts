import { RaffleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getRaffleLifecycleLabel,
  isRaffleListedOnMainPage,
} from "@/lib/raffles/lifecycle";

export type PublicRaffleFolder = {
  slug: string;
  title: string;
  lifecycle: string;
};

export async function listPublicRaffleFolders(): Promise<PublicRaffleFolder[]> {
  const raffles = await prisma.raffle.findMany({
    where: { status: { not: RaffleStatus.DRAFT } },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
  });

  return raffles
    .filter((r) => isRaffleListedOnMainPage(r))
    .map((r) => ({
      slug: r.slug,
      title: r.title,
      lifecycle: getRaffleLifecycleLabel(r),
    }))
    .sort((a, b) => {
      if (a.lifecycle === "LIVE" && b.lifecycle !== "LIVE") return -1;
      if (b.lifecycle === "LIVE" && a.lifecycle !== "LIVE") return 1;
      return a.title.localeCompare(b.title);
    });
}
