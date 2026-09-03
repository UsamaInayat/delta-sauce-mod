"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";
import { formatLocalDateTime, parseStoredDateTime } from "@/lib/datetime/local-input";

type BlacklistRow = {
  id: string;
  walletAddress: string | null;
  xHandle: string | null;
  raffleTitle: string;
  createdAt: string;
};

function formatHandle(xHandle: string | null) {
  return xHandle ? `@${xHandle.replace(/^@/, "")}` : "—";
}

export default function AdminBlacklistPage() {
  const [rows, setRows] = useState<BlacklistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/blacklist", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setRows(data.rows ?? []);
    setSelected(new Set());
  }

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, []);

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (rows.length && rows.every((row) => selected.has(row.id))) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((row) => row.id)));
  }

  async function unblacklistSelected() {
    if (!selected.size) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Unblacklist failed.");
        return;
      }
      setMessage(`Unblacklisted ${data.unblacklisted} row(s).`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <DeltaAdminShell pageTitle="Blacklist">
      <DeltaAdminWindow title="BLACKLIST.EXE" wide>
        <div className="al-admin-toolbar">
          <h1 className="arena-form-title">Blacklist</h1>
          <button
            type="button"
            className="al-admin-btn primary"
            disabled={busy || selected.size === 0}
            onClick={() => void unblacklistSelected()}
          >
            Unblacklist
          </button>
        </div>

        {message ? <p className="al-admin-notice">{message}</p> : null}

        {loading ? (
          <p className="al-empty-copy">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="al-empty-copy">No blacklisted entries yet.</p>
        ) : (
          <div className="al-admin-table-wrap">
            <table className="al-admin-table al-admin-select-table">
              <thead>
                <tr>
                  <th className="al-admin-check-col">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every((row) => selected.has(row.id))}
                      onChange={toggleAll}
                      aria-label="Select all rows"
                    />
                  </th>
                  <th>X Username</th>
                  <th>Wallet Address</th>
                  <th>Raffle</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="al-admin-check-col">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleRow(row.id)}
                        aria-label={`Select ${formatHandle(row.xHandle)}`}
                      />
                    </td>
                    <td>{formatHandle(row.xHandle)}</td>
                    <td>{row.walletAddress ?? "—"}</td>
                    <td>{row.raffleTitle}</td>
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
