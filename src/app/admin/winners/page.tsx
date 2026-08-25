"use client";

import { useEffect, useState } from "react";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";
import { formatLocalDateTime, parseStoredDateTime } from "@/lib/datetime/local-input";

type WinnerEntry = {
  walletAddress: string;
  walletEns: string | null;
  xHandle: string | null;
};

type EntrantEntry = WinnerEntry & {
  status: string;
  createdAt: string;
};

type WinnerRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  endsAt: string | null;
  winners: WinnerEntry[];
  entrants: EntrantEntry[];
};

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, headers: string[], lines: string[]) {
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatWallet(entry: WinnerEntry) {
  return entry.walletEns ?? entry.walletAddress;
}

function formatHandle(entry: WinnerEntry) {
  return entry.xHandle ? `@${entry.xHandle.replace(/^@/, "")}` : "";
}

export default function AdminWinnersPage() {
  const [rows, setRows] = useState<WinnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/winners")
      .then((res) => res.json())
      .then((data) => setRows(data.rows ?? []))
      .finally(() => setLoading(false));
  }, []);

  function exportRowWinners(row: WinnerRow) {
    const headers = ["raffle", "type", "closed_at", "wallet", "x_handle"];
    const lines = row.winners.map((winner) =>
      [
        csvEscape(row.title),
        csvEscape(row.type),
        csvEscape(row.endsAt ? formatLocalDateTime(parseStoredDateTime(row.endsAt)) : ""),
        csvEscape(formatWallet(winner)),
        csvEscape(formatHandle(winner)),
      ].join(","),
    );
    const slug = row.slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "") || "raffle";
    downloadCsv(`${slug}-winners.csv`, headers, lines);
  }

  function exportRowEntrants(row: WinnerRow) {
    const headers = ["raffle", "type", "closed_at", "wallet", "x_handle", "status", "entered_at"];
    const lines = row.entrants.map((entrant) =>
      [
        csvEscape(row.title),
        csvEscape(row.type),
        csvEscape(row.endsAt ? formatLocalDateTime(parseStoredDateTime(row.endsAt)) : ""),
        csvEscape(formatWallet(entrant)),
        csvEscape(formatHandle(entrant)),
        csvEscape(entrant.status),
        csvEscape(formatLocalDateTime(parseStoredDateTime(entrant.createdAt))),
      ].join(","),
    );
    const slug = row.slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "") || "raffle";
    downloadCsv(`${slug}-entrants.csv`, headers, lines);
  }

  return (
    <DeltaAdminShell pageTitle="Winners">
      <DeltaAdminWindow title="WINNERS.EXE" wide>
        <div className="al-admin-toolbar">
          <h1 className="arena-form-title">Winners</h1>
        </div>

        {loading ? (
          <p className="al-empty-copy">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="al-empty-copy">No closed raffles yet.</p>
        ) : (
          <div className="al-admin-table-wrap">
            <table className="al-admin-table">
              <thead>
                <tr>
                  <th>Raffle</th>
                  <th>Type</th>
                  <th>Closed</th>
                  <th>Export</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.type.replace(/_/g, " ")}</td>
                    <td>
                      {row.endsAt
                        ? formatLocalDateTime(parseStoredDateTime(row.endsAt))
                        : "—"}
                    </td>
                    <td>
                      <div className="al-admin-toolbar-actions">
                        <button
                          type="button"
                          className="al-admin-btn"
                          onClick={() => exportRowWinners(row)}
                          disabled={row.winners.length === 0}
                        >
                          Export Winners
                        </button>
                        <button
                          type="button"
                          className="al-admin-btn"
                          onClick={() => exportRowEntrants(row)}
                          disabled={row.entrants.length === 0}
                        >
                          Export Entrants
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
