import Link from "next/link";
import { RaffleStatus } from "@prisma/client";
import { DeltaShell } from "@/components/delta/delta-shell";
import { DeltaRaffleCardList } from "@/components/delta/delta-raffle-card";
import { prisma } from "@/lib/prisma";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

export const dynamic = "force-dynamic";

export default async function RafflesPage() {
  const raffles = await prisma.raffle.findMany({
    where: { status: { not: RaffleStatus.DRAFT } },
    orderBy: [{ startsAt: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { entries: true } } },
  });

  const live = raffles.filter((r) => getRaffleLifecycleLabel(r) === "LIVE");
  const scheduled = raffles.filter((r) => getRaffleLifecycleLabel(r) === "SCHEDULED");
  const ended = raffles.filter((r) => {
    const l = getRaffleLifecycleLabel(r);
    return l === "ENDED" || l === "FINALIZED";
  });

  const sections = [
    { title: "Live Now", items: live },
    { title: "Upcoming", items: scheduled },
    { title: "Past", items: ended },
  ].filter((s) => s.items.length > 0);

  return (
    <DeltaShell
      breadcrumb={[
        { label: "Explore", href: "https://deltasauceart.com/explore/all" },
        { label: "Raffles" },
      ]}
      pageTitle="Raffles"
      taskLabel="RAFFLES.EXE"
    >
      <div className="al-icons" aria-hidden="true">
        <div className="al-icon al-selected">
          <span className="al-icon-img al-icon-exe" />
          <span className="al-icon-label">RAFFLES.EXE</span>
        </div>
      </div>
      <div className="al-raffle-hub">
        {sections.length === 0 ? (
          <p className="al-empty-copy">No raffles published yet. Check back soon.</p>
        ) : (
          sections.map((section) => (
            <section key={section.title} className="al-raffle-section">
              <h2 className="al-raffle-section-title">{section.title}</h2>
              <DeltaRaffleCardList
                raffles={section.items.map((r) => ({
                  id: r.id,
                  title: r.title,
                  artist: r.artist ?? "DeltaSauce",
                  status: getRaffleLifecycleLabel(r),
                  statusOpen: getRaffleLifecycleLabel(r) === "LIVE",
                  chain: r.chain,
                  entries: String(r._count.entries),
                  href: `/raffles/${r.slug}`,
                }))}
              />
            </section>
          ))
        )}
        <p className="al-back-link">
          <Link href="https://deltasauceart.com/">← deltasauceart.com</Link>
        </p>
      </div>
    </DeltaShell>
  );
}
