"use client";

import { useEffect, useState } from "react";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";

type Collection = {
  id: string;
  name: string;
  contractAddress: string;
  chain: string;
};

type Snapshot = {
  id: string;
  takenAt: string;
  holderCount?: number;
  collection: Collection;
  _count?: { holders: number };
};

const CHAINS = [
  "ETHEREUM",
  "BASE",
  "POLYGON",
  "ARBITRUM",
  "OPTIMISM",
  "BITCOIN",
  "SOLANA",
  "XTZ",
];

export default function SnapshotsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newCollection, setNewCollection] = useState({
    name: "",
    contractAddress: "",
    chain: "ETHEREUM",
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload() {
    const [cols, snaps] = await Promise.all([
      fetch("/api/admin/collections").then((r) => r.json()),
      fetch("/api/admin/snapshots").then((r) => r.json()),
    ]);
    setCollections(cols.collections ?? []);
    setSnapshots(snaps.snapshots ?? []);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function addCollection() {
    const res = await fetch("/api/admin/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCollection),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error ?? "Failed to add collection");
      return;
    }
    setMessage(`Added ${data.collection.name}`);
    setNewCollection({ name: "", contractAddress: "", chain: "ETHEREUM" });
    await reload();
  }

  async function takeSnapshot() {
    if (!selectedId) return;
    setBusy(true);
    setMessage("Fetching holders from chain… (may take a minute)");
    const res = await fetch("/api/admin/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId: selectedId }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Snapshot failed");
      return;
    }
    if (data.warning) {
      setMessage(data.warning);
    } else {
      setMessage(`Snapshot saved — ${data.snapshot.holderCount} holders found.`);
    }
    await reload();
  }

  return (
    <DeltaAdminShell pageTitle="Snapshots">
      <DeltaAdminWindow title="SNAPSHOTS.EXE" wide>
        <h1 className="arena-form-title">Collection Snapshots</h1>
        <p className="arena-form-sub">
          Add a contract, then pull live holder wallets from OpenSea.
        </p>

        <section className="al-admin-section">
          <h2>Add Collection</h2>
          <div className="al-admin-field-row">
            <label className="al-admin-label">
              Name
              <input
                className="al-admin-input"
                value={newCollection.name}
                onChange={(e) =>
                  setNewCollection({ ...newCollection, name: e.target.value })
                }
              />
            </label>
            <label className="al-admin-label">
              Contract address
              <input
                className="al-admin-input"
                value={newCollection.contractAddress}
                onChange={(e) =>
                  setNewCollection({
                    ...newCollection,
                    contractAddress: e.target.value,
                  })
                }
                placeholder="0x…"
              />
            </label>
            <label className="al-admin-label">
              Chain
              <select
                className="al-admin-input"
                value={newCollection.chain}
                onChange={(e) =>
                  setNewCollection({ ...newCollection, chain: e.target.value })
                }
              >
                {CHAINS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="button" className="al-admin-btn primary" onClick={addCollection}>
            Add Collection
          </button>
        </section>

        <section className="al-admin-section">
          <h2>Take Snapshot</h2>
          <div className="al-admin-field-row">
            <label className="al-admin-label">
              Collection
              <select
                className="al-admin-input"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="">Select…</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.chain})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="al-admin-btn"
              onClick={takeSnapshot}
              disabled={busy || !selectedId}
            >
              {busy ? "Working…" : "Take Snapshot"}
            </button>
          </div>
        </section>

        <section className="al-admin-section">
          <h2>Recent Snapshots</h2>
          {snapshots.length === 0 ? (
            <p className="al-empty-copy">No snapshots yet.</p>
          ) : (
            <div className="al-admin-table-wrap">
              <table className="al-admin-table">
                <thead>
                  <tr>
                    <th>Collection</th>
                    <th>Taken</th>
                    <th>Holders</th>
                    <th>CSV</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshots.map((s) => (
                    <tr key={s.id}>
                      <td>{s.collection.name}</td>
                      <td>{new Date(s.takenAt).toLocaleString()}</td>
                      <td>{s._count?.holders ?? s.holderCount ?? 0}</td>
                      <td>
                        <a href={`/api/admin/snapshots/${s.id}/csv`}>Download</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {message ? (
          <p className={`al-admin-msg${message.includes("0 holder") ? " al-admin-warn" : ""}`}>
            {message}
          </p>
        ) : null}
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
