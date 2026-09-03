"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";
import { usePoll } from "@/lib/hooks/use-poll";
import { getRaffleLifecycleLabel } from "@/lib/raffles/lifecycle";

type SavedRaffle = {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  _count: { entries: number };
};

export default function SavedRafflesPage() {
  const [raffles, setRaffles] = useState<SavedRaffle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRaffles = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/raffles", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRaffles(data.raffles ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRaffles();
  }, [loadRaffles]);

  usePoll(loadRaffles);

  async function publish(id: string) {
    const res = await fetch(`/api/admin/raffles/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    const data = await res.json();
    if (!res.ok) {
      window.alert(data.error ?? "Publish failed.");
      return;
    }
    await loadRaffles();
  }

  async function finalize(id: string) {
    const res = await fetch(`/api/admin/raffles/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finalize" }),
    });
    if (!res.ok) {
      const data = await res.json();
      window.alert(data.error ?? "Finalize failed.");
      return;
    }
    await loadRaffles();
  }

  async function removeRaffle(id: string, title: string) {
    if (
      !window.confirm(
        `Delete "${title}" permanently? All entries will be removed and it will disappear from the public raffles page. This cannot be undone.`,
      )
    ) {
      return;
    }

    const res = await fetch(`/api/admin/raffles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      window.alert(data.error ?? "Delete failed");
      return;
    }

    setRaffles((prev) => prev.filter((r) => r.id !== id));
  }

  async function logout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.href = "/admin/login";
  }

  return (
    <DeltaAdminShell pageTitle="Saved Raffles">
      <DeltaAdminWindow title="SAVED_RAFFLES.EXE" wide>
        <div className="al-admin-toolbar">
          <h1 className="arena-form-title">Saved Raffles</h1>
          <button type="button" className="al-admin-btn" onClick={logout}>
            Logout
          </button>
        </div>

        {loading ? (
          <p className="al-empty-copy">Loading…</p>
        ) : raffles.length === 0 ? (
          <p className="al-empty-copy">
            No raffles yet. <Link href="/admin/raffles/new">Create one</Link>.
          </p>
        ) : (
          <div className="al-admin-table-wrap">
            <table className="al-admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Status</th>
                <th>Entries</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {raffles.map((r) => {
                const lifecycle = getRaffleLifecycleLabel({
                  status: r.status as "DRAFT" | "PUBLISHED" | "CLOSED",
                  startsAt: r.startsAt ? new Date(r.startsAt) : null,
                  endsAt: r.endsAt ? new Date(r.endsAt) : null,
                });
                return (
                  <tr key={r.id}>
                    <td>
                      <Link href={`/raffles/${r.slug}`}>{r.title}</Link>
                    </td>
                    <td>{r.type.replace(/_/g, " ")}</td>
                    <td>{lifecycle}</td>
                    <td>{r._count.entries}</td>
                    <td className="al-admin-actions">
                      <Link
                        href={`/admin/raffles/${r.id}/edit`}
                        className="al-admin-btn"
                      >
                        Edit
                      </Link>
                      {r.status === "DRAFT" ? (
                        <button
                          type="button"
                          className="al-admin-btn"
                          onClick={() => publish(r.id)}
                        >
                          Publish
                        </button>
                      ) : null}
                      {lifecycle === "ENDED" || lifecycle === "LIVE" ? (
                        <button
                          type="button"
                          className="al-admin-btn"
                          onClick={() => finalize(r.id)}
                        >
                          Finalize
                        </button>
                      ) : null}
                      <Link
                        href={`/admin/winners/${r.id}`}
                        className="al-admin-btn"
                      >
                        Explore
                      </Link>
                      <button
                        type="button"
                        className="al-admin-btn"
                        onClick={() => removeRaffle(r.id, r.title)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
