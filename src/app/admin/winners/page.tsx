"use client";

import { useEffect, useState } from "react";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";

type WinnerRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  closedAt: string | null;
  winners: Array<{
    walletAddress: string;
    walletEns: string | null;
    xHandle: string;
  }>;
};

export default function WinnersPage() {
  const [rows, setRows] = useState<WinnerRow[]>([]);

  useEffect(() => {
    void fetch("/api/admin/winners")
      .then((r) => r.json())
      .then((d) => setRows(d.winners ?? []));
  }, []);

  function exportCsv() {
    const lines = ["raffle,wallet,ens,x_handle"];
    for (const row of rows) {
      for (const w of row.winners) {
        lines.push(
          `"${row.title}","${w.walletAddress}","${w.walletEns ?? ""}","${w.xHandle}"`,
        );
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "delta-winners.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DeltaAdminShell pageTitle="Winners">
      <div className="al-admin-panel">
        <div className="al-admin-toolbar">
          <h1 className="al-admin-title">Winners</h1>
          <button type="button" className="al-admin-btn" onClick={exportCsv}>
            Export CSV
          </button>
        </div>

        {rows.length === 0 ? (
          <p>No finalized raffles yet.</p>
        ) : (
          <table className="al-admin-table">
            <thead>
              <tr>
                <th>Raffle</th>
                <th>Type</th>
                <th>Closed</th>
                <th>Winners</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.title}</td>
                  <td>{row.type.replace(/_/g, " ")}</td>
                  <td>
                    {row.closedAt
                      ? new Date(row.closedAt).toLocaleString()
                      : "—"}
                  </td>
                  <td>
                    <ul className="al-admin-winner-list">
                      {row.winners.map((w) => (
                        <li key={w.walletAddress}>
                          {w.walletEns ?? w.walletAddress} (@{w.xHandle})
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DeltaAdminShell>
  );
}
