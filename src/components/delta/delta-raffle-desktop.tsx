"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DeltaRaffleDesktopIcons } from "@/components/delta/delta-raffle-desktop-icons";
import { gateFetch } from "@/lib/auth/gate-fetch";
import { usePoll } from "@/lib/hooks/use-poll";
import type { PublicRaffleFolder } from "@/lib/raffles/public-folders";

type FolderVisual = "live" | "won" | "lost";

export type RaffleFolder = PublicRaffleFolder;

function foldersEqual(a: RaffleFolder[], b: RaffleFolder[]) {
  if (a.length !== b.length) return false;
  return a.every(
    (folder, index) =>
      folder.slug === b[index]?.slug &&
      folder.title === b[index]?.title &&
      folder.lifecycle === b[index]?.lifecycle,
  );
}

export function DeltaRaffleDesktop({
  raffles: initialRaffles,
}: {
  raffles: RaffleFolder[];
}) {
  const [raffles, setRaffles] = useState(initialRaffles);
  const [states, setStates] = useState<Record<string, FolderVisual>>({});

  const refreshFolderStates = useCallback(async (folders: RaffleFolder[]) => {
    const wallets: Record<string, string> = {};
    for (const raffle of folders) {
      const stored = localStorage.getItem(`ds-wallet-${raffle.slug}`);
      if (stored?.trim()) {
        wallets[raffle.slug] = stored.trim();
      }
    }

    try {
      const res = await gateFetch("/api/raffles/folder-states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallets }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setStates((data.states ?? {}) as Record<string, FolderVisual>);
    } catch {
      const fallback: Record<string, FolderVisual> = {};
      for (const raffle of folders) {
        fallback[raffle.slug] =
          raffle.lifecycle === "LIVE" ? "live" : "lost";
      }
      setStates(fallback);
    }
  }, []);

  const refreshRaffles = useCallback(async () => {
    try {
      const res = await gateFetch("/api/raffles");
      if (!res.ok) return;
      const data = (await res.json()) as { folders?: RaffleFolder[] };
      const next = data.folders ?? [];
      setRaffles((prev) => (foldersEqual(prev, next) ? prev : next));
      await refreshFolderStates(next);
    } catch {
      // keep last known list
    }
  }, [refreshFolderStates]);

  usePoll(refreshRaffles);

  useEffect(() => {
    void refreshFolderStates(initialRaffles);
  }, [initialRaffles, refreshFolderStates]);

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
