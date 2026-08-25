"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DeltaRaffleDesktopIcons } from "@/components/delta/delta-raffle-desktop-icons";

export type RaffleFolder = {
  slug: string;
  title: string;
  lifecycle: string;
};

type FolderVisual = "live" | "won" | "lost";

export function DeltaRaffleDesktop({ raffles }: { raffles: RaffleFolder[] }) {
  const [states, setStates] = useState<Record<string, FolderVisual>>({});

  const liveSlugs = useMemo(
    () =>
      raffles
        .filter((r) => r.lifecycle === "LIVE")
        .map((r) => r.slug)
        .join(","),
    [raffles],
  );

  useEffect(() => {
    const wallets: Record<string, string> = {};
    for (const raffle of raffles) {
      const stored = localStorage.getItem(`ds-wallet-${raffle.slug}`);
      if (stored?.trim()) {
        wallets[raffle.slug] = stored.trim();
      }
    }

    void fetch("/api/raffles/folder-states", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallets }),
    })
      .then((r) => r.json())
      .then((d) => setStates((d.states ?? {}) as Record<string, FolderVisual>))
      .catch(() => {
        const fallback: Record<string, FolderVisual> = {};
        for (const raffle of raffles) {
          fallback[raffle.slug] =
            raffle.lifecycle === "LIVE" ? "live" : "lost";
        }
        setStates(fallback);
      });
  }, [raffles, liveSlugs]);

  function visualFor(raffle: RaffleFolder): FolderVisual {
    if (raffle.lifecycle === "LIVE") return "live";
    return states[raffle.slug] ?? "lost";
  }

  return (
    <div className="al-raffle-desktop">
      <DeltaRaffleDesktopIcons />
      {raffles.length === 0 ? (
        <p className="al-empty-copy al-desktop-empty">
          No live raffles right now. Check back soon.
        </p>
      ) : (
      <div className="al-raffle-folders" role="list">
        {raffles.map((raffle) => {
          const visual = visualFor(raffle);
          return (
            <Link
              key={raffle.slug}
              href={`/raffles/${raffle.slug}`}
              className={`al-icon${visual === "won" ? " al-raffle-folder-won" : ""}`}
              role="listitem"
              prefetch={false}
            >
              <span className="al-icon-img al-icon-folderimg" aria-hidden="true" />
              <span className="al-icon-label">{raffle.title}</span>
            </Link>
          );
        })}
      </div>
      )}
      <p className="al-back-link al-desktop-back">
        <Link href="https://deltasauceart.com/">← deltasauceart.com</Link>
      </p>
    </div>
  );
}
