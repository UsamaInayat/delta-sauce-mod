import { RaffleStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { DeltaShell } from "@/components/delta/delta-shell";
import { DeltaRaffleDesktop } from "@/components/delta/delta-raffle-desktop";
import { prisma } from "@/lib/prisma";
import { requireRaffleGate, RaffleGateError } from "@/lib/auth/raffle-gate";
import {
  getRaffleLifecycleLabel,
  isRaffleListedOnMainPage,
} from "@/lib/raffles/lifecycle";

export const dynamic = "force-dynamic";

export default async function RafflesPage() {
  try {
    await requireRaffleGate();
  } catch (error) {
    if (error instanceof RaffleGateError) {
      redirect("/raffles/unlock?next=%2Fraffles");
    }
    throw error;
  }

  const raffles = await prisma.raffle.findMany({
    where: { status: { not: RaffleStatus.DRAFT } },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
  });

  const folders = raffles
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

  return (
    <DeltaShell
      breadcrumb={[
        { label: "Explore", href: "https://deltasauceart.com/explore/all" },
        { label: "Raffles" },
      ]}
      pageTitle="Raffles"
      taskLabel="RAFFLES.EXE"
    >
      <DeltaRaffleDesktop raffles={folders} />
    </DeltaShell>
  );
}
