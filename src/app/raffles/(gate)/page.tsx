import { DeltaShell } from "@/components/delta/delta-shell";
import { DeltaRaffleDesktop } from "@/components/delta/delta-raffle-desktop";
import { listPublicRaffleFolders } from "@/lib/raffles/public-folders";

export const dynamic = "force-dynamic";

export default async function RafflesPage() {
  const folders = await listPublicRaffleFolders();

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
