"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";
import {
  exportEntriesCsv,
  type ExploreEntry,
} from "@/lib/admin/csv-export";

type ExplorePayload = {
  raffle: {
    id: string;
    slug: string;
    title: string;
    type: string;
    finalized: boolean;
    exploreType: "draw" | "collection" | "other";
  };
  winners: ExploreEntry[];
  entrants: ExploreEntry[];
};

function SelectableTable({
  rows,
  selected,
  onToggle,
  onToggleAll,
  showBlacklisted = false,
}: {
  rows: ExploreEntry[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  showBlacklisted?: boolean;
}) {
  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));

  return (
    <div className="al-admin-table-wrap">
      <table className="al-admin-table al-admin-select-table">
        <thead>
          <tr>
            <th className="al-admin-check-col">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all rows"
              />
            </th>
            <th>X Username</th>
            <th>Wallet Address</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={3} className="al-empty-copy">
                No rows yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className={
                  showBlacklisted && row.blacklisted ? "al-admin-row-blacklisted" : undefined
                }
              >
                <td className="al-admin-check-col">
                  <input
                    type="checkbox"
                    checked={selected.has(row.id)}
                    onChange={() => onToggle(row.id)}
                    aria-label={`Select ${formatHandle(row)}`}
                  />
                </td>
                <td>{formatHandle(row)}</td>
                <td>{formatWallet(row)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatWallet(entry: ExploreEntry) {
  return entry.walletEns ?? entry.walletAddress;
}

function formatHandle(entry: ExploreEntry) {
  return entry.xHandle ? `@${entry.xHandle.replace(/^@/, "")}` : "—";
}

export default function ExploreRafflePage() {
  const params = useParams<{ id: string }>();
  const raffleId = params.id;
  const [data, setData] = useState<ExplorePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [winnerSelection, setWinnerSelection] = useState<Set<string>>(new Set());
  const [entrantSelection, setEntrantSelection] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/winners/${raffleId}`, { cache: "no-store" });
    if (!res.ok) {
      setData(null);
      return;
    }
    const payload = (await res.json()) as ExplorePayload;
    setData(payload);
    setWinnerSelection(new Set());
    setEntrantSelection(new Set());
  }, [raffleId]);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  function toggleSelection(
    current: Set<string>,
    setCurrent: (next: Set<string>) => void,
    id: string,
  ) {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCurrent(next);
  }

  function toggleAll(
    rows: ExploreEntry[],
    current: Set<string>,
    setCurrent: (next: Set<string>) => void,
  ) {
    if (rows.length && rows.every((row) => current.has(row.id))) {
      setCurrent(new Set());
      return;
    }
    setCurrent(new Set(rows.map((row) => row.id)));
  }

  function pickRows(all: ExploreEntry[], selected: Set<string>) {
    return selected.size ? all.filter((row) => selected.has(row.id)) : all;
  }

  async function runAction(
    action: "blacklist" | "reroll",
    table: "winners" | "entrants",
    selected: Set<string>,
    allRows: ExploreEntry[],
  ) {
    setBusy(true);
    setMessage(null);
    try {
      const entryIds =
        selected.size > 0 ? [...selected] : allRows.map((row) => row.id);
      const res = await fetch(`/api/admin/winners/${raffleId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, table, entryIds }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error ?? "Action failed.");
        return;
      }
      setMessage(
        action === "blacklist"
          ? `Blacklisted ${payload.blacklisted ?? entryIds.length} row(s).`
          : `Rerolled ${payload.rerolled ?? payload.released ?? entryIds.length} row(s).`,
      );
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <DeltaAdminShell pageTitle="Explore Raffle">
        <DeltaAdminWindow title="EXPLORE.EXE" wide>
          <p className="al-empty-copy">Loading…</p>
        </DeltaAdminWindow>
      </DeltaAdminShell>
    );
  }

  if (!data) {
    return (
      <DeltaAdminShell pageTitle="Explore Raffle">
        <DeltaAdminWindow title="EXPLORE.EXE" wide>
          <p className="al-empty-copy">Raffle not found.</p>
          <Link href="/admin/winners" className="al-admin-btn">
            Back to Winners
          </Link>
        </DeltaAdminWindow>
      </DeltaAdminShell>
    );
  }

  const { raffle, winners, entrants } = data;
  const slug = raffle.slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "") || "raffle";
  const isDraw = raffle.exploreType === "draw";
  const isCollection = raffle.exploreType === "collection";
  const showWinners = isDraw && (raffle.finalized || winners.length > 0);
  const showEntrants = isDraw ? !raffle.finalized || entrants.length > 0 : isCollection;

  return (
    <DeltaAdminShell pageTitle={`Explore — ${raffle.title}`}>
      <DeltaAdminWindow title="EXPLORE.EXE" wide>
        <div className="al-admin-toolbar">
          <div>
            <h1 className="arena-form-title">{raffle.title}</h1>
            <p className="arena-form-sub">
              {raffle.type.replace(/_/g, " ")}
              {raffle.finalized ? " · Finalized" : " · Open / pending finalize"}
            </p>
          </div>
          <Link href="/admin/winners" className="al-admin-btn">
            Back
          </Link>
        </div>

        {message ? <p className="al-admin-notice">{message}</p> : null}

        {showWinners ? (
          <section className="al-admin-explore-section">
            <div className="al-admin-toolbar">
              <h2 className="al-admin-section-title">Winners</h2>
              <div className="al-admin-toolbar-actions">
                <button
                  type="button"
                  className="al-admin-btn"
                  disabled={busy || winners.length === 0}
                  onClick={() =>
                    exportEntriesCsv(
                      `${slug}-winners.csv`,
                      pickRows(winners, winnerSelection),
                    )
                  }
                >
                  Export Winners
                </button>
                <button
                  type="button"
                  className="al-admin-btn"
                  disabled={busy || winners.length === 0}
                  onClick={() =>
                    void runAction("reroll", "winners", winnerSelection, winners)
                  }
                >
                  Reroll
                </button>
                <button
                  type="button"
                  className="al-admin-btn"
                  disabled={busy || winners.length === 0}
                  onClick={() =>
                    void runAction("blacklist", "winners", winnerSelection, winners)
                  }
                >
                  Blacklist
                </button>
              </div>
            </div>
            <SelectableTable
              rows={winners}
              selected={winnerSelection}
              onToggle={(id) => toggleSelection(winnerSelection, setWinnerSelection, id)}
              onToggleAll={() => toggleAll(winners, winnerSelection, setWinnerSelection)}
            />
          </section>
        ) : null}

        {showEntrants ? (
          <section className="al-admin-explore-section">
            <div className="al-admin-toolbar">
              <h2 className="al-admin-section-title">
                {isCollection ? "Entrants" : "Entries"}
              </h2>
              <div className="al-admin-toolbar-actions">
                <button
                  type="button"
                  className="al-admin-btn"
                  disabled={busy || entrants.length === 0}
                  onClick={() =>
                    exportEntriesCsv(
                      `${slug}-entrants.csv`,
                      pickRows(entrants, entrantSelection),
                      isDraw,
                    )
                  }
                >
                  Export Entrants
                </button>
                {isCollection ? (
                  <button
                    type="button"
                    className="al-admin-btn"
                    disabled={busy || entrants.length === 0}
                    onClick={() =>
                      void runAction("reroll", "entrants", entrantSelection, entrants)
                    }
                  >
                    Reroll
                  </button>
                ) : null}
                <button
                  type="button"
                  className="al-admin-btn"
                  disabled={busy || entrants.length === 0}
                  onClick={() =>
                    void runAction("blacklist", "entrants", entrantSelection, entrants)
                  }
                >
                  Blacklist
                </button>
              </div>
            </div>
            <SelectableTable
              rows={entrants}
              selected={entrantSelection}
              onToggle={(id) => toggleSelection(entrantSelection, setEntrantSelection, id)}
              onToggleAll={() => toggleAll(entrants, entrantSelection, setEntrantSelection)}
              showBlacklisted={isCollection}
            />
          </section>
        ) : null}
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
