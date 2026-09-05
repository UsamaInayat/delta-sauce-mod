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

type GcMember = {
  id: string;
  xHandle: string;
};

type GcSnapshot = {
  id: string;
  conversationId: string;
  takenAt: string;
  memberCount: number;
  members: GcMember[];
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

type SnapshotTab = "collection" | "group-chat";

function CollectionSnapshotPanel({
  message,
  setMessage,
}: {
  message: string;
  setMessage: (value: string) => void;
}) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [newCollection, setNewCollection] = useState({
    name: "",
    contractAddress: "",
    chain: "ETHEREUM",
  });
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
    <>
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
    </>
  );
}

function GroupChatSnapshotPanel({
  message,
  setMessage,
}: {
  message: string;
  setMessage: (value: string) => void;
}) {
  const [snapshot, setSnapshot] = useState<GcSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const res = await fetch("/api/admin/group-chat-snapshot", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setSnapshot(data.snapshot ?? null);
  }

  useEffect(() => {
    void reload().finally(() => setLoading(false));
  }, []);

  async function importCsv(file: File) {
    setBusy(true);
    setMessage(`Importing ${file.name}…`);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/group-chat-snapshot", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error ?? "Import failed");
      return;
    }
    setSnapshot(data.snapshot);
    setMessage(`Imported ${data.snapshot.memberCount} members.`);
  }

  return (
    <>
      <div className="al-admin-toolbar">
        <div>
          <h1 className="arena-form-title">Group Chat Snapshot</h1>
          <p className="arena-form-sub">
            Delta Sauce GC —{" "}
            <a
              href="https://x.com/i/chat/g2010420839276057016"
              target="_blank"
              rel="noopener noreferrer"
            >
              x.com/i/chat/g2010420839276057016
            </a>
          </p>
          <p className="arena-form-sub">
            Only X handles in the imported snapshot can enter giveaways on the backend.
          </p>
        </div>
        <label className="al-admin-btn primary al-admin-file-btn">
          {busy ? "Importing…" : "Import CSV"}
          <input
            type="file"
            accept=".csv,text/csv"
            disabled={busy}
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importCsv(file);
            }}
          />
        </label>
      </div>

      <section className="al-admin-section">
        <h2>How to export members from X</h2>
        <ol className="al-admin-steps">
          <li>
            Open the{" "}
            <a
              href="https://x.com/i/chat/g2010420839276057016"
              target="_blank"
              rel="noopener noreferrer"
            >
              Delta Sauce GC
            </a>{" "}
            and paste <code>scripts/x-gc-member-export.js</code> in the console.
          </li>
          <li>
            Click the group name → <strong>All members</strong> (not the chat thread).
          </li>
          <li>Scroll through the full members list once.</li>
          <li>
            Click <strong>Auto-scroll collect</strong>, then <strong>Download CSV</strong> or{" "}
            <strong>Copy CSV</strong>.
          </li>
          <li>Import the file here with <strong>Import CSV</strong>.</li>
        </ol>
      </section>

      {loading ? (
        <p className="al-empty-copy">Loading…</p>
      ) : !snapshot ? (
        <p className="al-empty-copy">
          No group chat snapshot yet. Export a CSV from X, then import it here.
        </p>
      ) : (
        <>
          <p className="arena-form-sub">
            <strong>{snapshot.memberCount}</strong> members · last imported{" "}
            {new Date(snapshot.takenAt).toLocaleString()}
          </p>
          <div className="al-admin-table-wrap">
            <table className="al-admin-table">
              <thead>
                <tr>
                  <th>X Username</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.members.map((member) => (
                  <tr key={member.id}>
                    <td>@{member.xHandle.replace(/^@/, "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

export default function SnapshotsPage() {
  const [tab, setTab] = useState<SnapshotTab>("collection");
  const [message, setMessage] = useState("");

  return (
    <DeltaAdminShell pageTitle="Snapshots">
      <DeltaAdminWindow title="SNAPSHOTS.EXE" wide>
        <ul className="al-admin-subtabs" role="tablist" aria-label="Snapshot types">
          <li>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "collection"}
              className={`al-admin-subtab${tab === "collection" ? " active" : ""}`}
              onClick={() => {
                setTab("collection");
                setMessage("");
              }}
            >
              Collection Snapshot
            </button>
          </li>
          <li>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "group-chat"}
              className={`al-admin-subtab${tab === "group-chat" ? " active" : ""}`}
              onClick={() => {
                setTab("group-chat");
                setMessage("");
              }}
            >
              Group Chat Snapshot
            </button>
          </li>
        </ul>

        {tab === "collection" ? (
          <CollectionSnapshotPanel message={message} setMessage={setMessage} />
        ) : (
          <GroupChatSnapshotPanel message={message} setMessage={setMessage} />
        )}

        {message ? (
          <p className={`al-admin-msg${message.includes("0 holder") ? " al-admin-warn" : ""}`}>
            {message}
          </p>
        ) : null}
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
