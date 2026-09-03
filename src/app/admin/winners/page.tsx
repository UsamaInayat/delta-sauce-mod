"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";
import { formatLocalDateTime, parseStoredDateTime } from "@/lib/datetime/local-input";

type WinnerRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  endsAt: string | null;
};

export default function AdminWinnersPage() {
  const [rows, setRows] = useState<WinnerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/winners")
      .then((res) => res.json())
      .then((data) => setRows(data.rows ?? []))
      .finally(() => setLoading(false));
  }, []);

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
                  <th>Actions</th>
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
                      <Link
                        href={`/admin/winners/${row.id}`}
                        className="al-admin-btn"
                      >
                        Explore
                      </Link>
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
