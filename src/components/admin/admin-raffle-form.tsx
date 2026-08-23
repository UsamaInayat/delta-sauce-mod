"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DeltaAdminShell } from "@/components/admin/delta-admin-shell";
import { DeltaAdminWindow } from "@/components/admin/delta-admin-window";
import { TimePresetTag } from "@/components/admin/time-preset-tag";
import { toDateTimeLocalInputValue, parseDateTimeLocalValue, localInputToIso } from "@/lib/datetime/local-input";

const RAFFLE_TYPES = [
  { value: "LUCKY_DRAW", label: "Lucky Draw" },
  { value: "FCFS", label: "FCFS Wallet Collection" },
  { value: "WALLET_COLLECTION", label: "Wallet Collection" },
  { value: "ARTWORK_GIVEAWAY", label: "Artwork Giveaway" },
] as const;

const CHAINS = [
  "ETHEREUM",
  "BASE",
  "POLYGON",
  "ARBITRUM",
  "OPTIMISM",
  "BITCOIN",
  "SOLANA",
  "XTZ",
] as const;

type Collection = { id: string; name: string };

type LoadedRaffle = {
  id: string;
  title: string;
  phase: string | null;
  artist: string | null;
  description: string;
  type: string;
  status: string;
  chain: string;
  startsAt: string | null;
  endsAt: string | null;
  winnerCount: number | null;
  autoFinalize: boolean;
  tokenGated: boolean;
  collections: Array<{ collectionId: string }>;
  itemName: string | null;
  openseaUrl: string | null;
  artworkCollection: string | null;
};

function raffleToForm(raffle: LoadedRaffle) {
  return {
    title: raffle.title ?? "",
    phase: raffle.phase ?? "",
    artist: raffle.artist ?? "",
    description: raffle.description ?? "",
    type: raffle.type ?? "LUCKY_DRAW",
    chain: raffle.chain ?? "ETHEREUM",
    startsAt: toDateTimeLocalInputValue(raffle.startsAt),
    endsAt: toDateTimeLocalInputValue(raffle.endsAt),
    winnerCount: String(raffle.winnerCount ?? 1),
    autoFinalize: raffle.autoFinalize !== false,
    tokenGated: Boolean(raffle.tokenGated),
    collectionIds: (raffle.collections ?? []).map((c) => c.collectionId),
    itemName: raffle.itemName ?? "",
    openseaUrl: raffle.openseaUrl ?? "",
    artworkCollection: raffle.artworkCollection ?? "",
  };
}

function addHours(base: Date, hours: number) {
  return new Date(base.getTime() + hours * 3600_000);
}

function addMinutes(base: Date, minutes: number) {
  return new Date(base.getTime() + minutes * 60_000);
}

export default function AdminRaffleForm({
  raffleId,
}: {
  raffleId?: string;
}) {
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [raffleStatus, setRaffleStatus] = useState<string>("DRAFT");

  const [form, setForm] = useState({
    title: "",
    phase: "",
    artist: "",
    description: "",
    type: "LUCKY_DRAW",
    chain: "ETHEREUM",
    startsAt: "",
    endsAt: "",
    winnerCount: "1",
    autoFinalize: true,
    tokenGated: false,
    collectionIds: [] as string[],
    itemName: "",
    openseaUrl: "",
    artworkCollection: "",
  });

  useEffect(() => {
    void fetch("/api/admin/collections")
      .then((r) => r.json())
      .then((d) => setCollections(d.collections ?? []));
  }, []);

  useEffect(() => {
    if (!raffleId) return;
    void fetch(`/api/admin/raffles/${raffleId}`)
      .then((r) => r.json())
      .then((d) => {
        const raffle = d.raffle as LoadedRaffle | undefined;
        if (!raffle) return;
        setRaffleStatus(raffle.status ?? "DRAFT");
        setForm(raffleToForm(raffle));
      });
  }, [raffleId]);

  function setStartsFromPreset(minutes: number) {
    setForm((f) => ({
      ...f,
      startsAt: toDateTimeLocalInputValue(addMinutes(new Date(), minutes)),
    }));
  }

  function setEndsFromPreset(hours: number) {
    const base = form.startsAt
      ? (parseDateTimeLocalValue(form.startsAt) ?? new Date())
      : new Date();
    setForm((f) => ({
      ...f,
      endsAt: toDateTimeLocalInputValue(addHours(base, hours)),
    }));
  }

  async function persistRaffle(id: string) {
    const res = await fetch(`/api/admin/raffles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Save failed");
    }
    const raffle = data.raffle as LoadedRaffle;
    setRaffleStatus(raffle.status ?? "DRAFT");
    return raffle;
  }

  function buildPayload() {
    const dates = {
      startsAt: form.startsAt ? localInputToIso(form.startsAt) : null,
      endsAt: form.endsAt ? localInputToIso(form.endsAt) : null,
    };

    if (form.type === "ARTWORK_GIVEAWAY") {
      return {
        ...form,
        ...dates,
        title: form.itemName.trim() || form.title.trim(),
        phase: "",
        artist: "",
        description: "",
      };
    }
    return { ...form, ...dates };
  }

  async function ensureRaffleId(): Promise<string> {
    if (raffleId) {
      await persistRaffle(raffleId);
      return raffleId;
    }
    const res = await fetch("/api/admin/raffles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload()),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Save failed");
    }
    const id = data.raffle.id as string;
    router.replace(`/admin/raffles/${id}/edit`);
    return id;
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      if (raffleId) {
        await persistRaffle(raffleId);
        setMessage("Saved.");
      } else {
        const res = await fetch("/api/admin/raffles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildPayload()),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessage(data.error ?? "Save failed");
          return;
        }
        setMessage("Saved.");
        router.push(`/admin/raffles/${data.raffle.id}/edit`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function publishRaffle() {
    setSaving(true);
    setMessage("");
    try {
      const id = await ensureRaffleId();

      const res = await fetch(`/api/admin/raffles/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error ?? "Publish failed");
        return;
      }

      const data = await res.json();
      setRaffleStatus(data.raffle?.status ?? "PUBLISHED");
      setMessage("Published.");
      router.push("/admin/raffles");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setSaving(false);
    }
  }

  const isArtwork = form.type === "ARTWORK_GIVEAWAY";

  return (
    <DeltaAdminShell pageTitle={raffleId ? "Edit Raffle" : "Create Raffle"}>
      <DeltaAdminWindow
        title={raffleId ? "EDIT_RAFFLE.EXE" : "CREATE_RAFFLE.EXE"}
        wide
      >
        <h1 className="arena-form-title">
          {raffleId ? "Edit Raffle" : "Create Raffle"}
        </h1>

        <label className="al-admin-label">
          Raffle Type
          <select
            className="al-admin-input"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {RAFFLE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        {isArtwork ? (
          <>
            <label className="al-admin-label">
              Item Name
              <input
                className="al-admin-input"
                value={form.itemName}
                onChange={(e) => setForm({ ...form, itemName: e.target.value })}
              />
            </label>
            <label className="al-admin-label">
              OpenSea Link
              <input
                className="al-admin-input"
                value={form.openseaUrl}
                onChange={(e) => setForm({ ...form, openseaUrl: e.target.value })}
                placeholder="https://opensea.io/item/..."
              />
            </label>
            <label className="al-admin-label">
              Collection
              <input
                className="al-admin-input"
                value={form.artworkCollection}
                onChange={(e) =>
                  setForm({ ...form, artworkCollection: e.target.value })
                }
              />
            </label>
            <label className="al-admin-label">
              Winners
              <input
                className="al-admin-input"
                type="number"
                min={1}
                value={form.winnerCount}
                onChange={(e) => setForm({ ...form, winnerCount: e.target.value })}
              />
            </label>
          </>
        ) : null}

        {!isArtwork ? (
          <>
            <label className="al-admin-label">
              Raffle Title
              <input
                className="al-admin-input"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>

            <div className="al-admin-field-row">
              <label className="al-admin-label">
                Phase
                <input
                  className="al-admin-input"
                  value={form.phase}
                  onChange={(e) => setForm({ ...form, phase: e.target.value })}
                />
              </label>
              <label className="al-admin-label">
                Chain
                <select
                  className="al-admin-input"
                  value={form.chain}
                  onChange={(e) => setForm({ ...form, chain: e.target.value })}
                >
                  {CHAINS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="al-admin-label">
              Artist
              <input
                className="al-admin-input"
                value={form.artist}
                onChange={(e) => setForm({ ...form, artist: e.target.value })}
              />
            </label>

            <label className="al-admin-label">
              Description
              <textarea
                className="al-admin-textarea"
                rows={6}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Supports **bold** and *italic* markers"
              />
            </label>
          </>
        ) : null}

        <div className="al-admin-datetime-row">
          <div className="al-admin-datetime-col">
            <label className="al-admin-label">
              Starts at
              <input
                className="al-admin-input"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <div className="al-admin-presets">
              <TimePresetTag label="3m" onClick={() => setStartsFromPreset(3)} />
              <TimePresetTag label="5m" onClick={() => setStartsFromPreset(5)} />
              <TimePresetTag label="10m" onClick={() => setStartsFromPreset(10)} />
            </div>
          </div>
          <div className="al-admin-datetime-col">
            <label className="al-admin-label">
              Ends at
              <input
                className="al-admin-input"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </label>
            <div className="al-admin-presets">
              <TimePresetTag label="6h" onClick={() => setEndsFromPreset(6)} />
              <TimePresetTag label="12h" onClick={() => setEndsFromPreset(12)} />
              <TimePresetTag label="24h" onClick={() => setEndsFromPreset(24)} />
              <TimePresetTag label="48h" onClick={() => setEndsFromPreset(48)} />
              <TimePresetTag label="72h" onClick={() => setEndsFromPreset(72)} />
            </div>
          </div>
        </div>

        {!isArtwork && form.type !== "WALLET_COLLECTION" ? (
          <label className="al-admin-label">
            Winners
            <input
              className="al-admin-input"
              type="number"
              min={1}
              value={form.winnerCount}
              onChange={(e) => setForm({ ...form, winnerCount: e.target.value })}
            />
          </label>
        ) : null}

        <fieldset className="al-admin-fieldset">
          <legend>Is it a token gated raffle?</legend>
          <button
            type="button"
            className={`al-admin-toggle${form.tokenGated ? " active" : ""}`}
            onClick={() => setForm({ ...form, tokenGated: true })}
          >
            Yes
          </button>
          <button
            type="button"
            className={`al-admin-toggle${!form.tokenGated ? " active" : ""}`}
            onClick={() => setForm({ ...form, tokenGated: false, collectionIds: [] })}
          >
            No
          </button>
        </fieldset>

        {form.tokenGated ? (
          <label className="al-admin-label">
            Eligible collections
            <select
              className="al-admin-input"
              multiple
              value={form.collectionIds}
              onChange={(e) =>
                setForm({
                  ...form,
                  collectionIds: Array.from(e.target.selectedOptions).map(
                    (o) => o.value,
                  ),
                })
              }
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <fieldset className="al-admin-fieldset">
          <legend>Should the raffle end automatically?</legend>
          <button
            type="button"
            className={`al-admin-toggle${form.autoFinalize ? " active" : ""}`}
            onClick={() => setForm({ ...form, autoFinalize: true })}
          >
            Yes
          </button>
          <button
            type="button"
            className={`al-admin-toggle${!form.autoFinalize ? " active" : ""}`}
            onClick={() => setForm({ ...form, autoFinalize: false })}
          >
            No
          </button>
        </fieldset>

        {message ? <p className="al-admin-msg">{message}</p> : null}

        <div className="al-admin-btn-row">
          <button
            type="button"
            className="al-admin-btn primary"
            disabled={saving}
            onClick={save}
          >
            Save
          </button>
          {!raffleId ? (
            <button
              type="button"
              className="al-admin-btn"
              disabled={saving}
              onClick={publishRaffle}
            >
              Publish
            </button>
          ) : null}
        </div>
      </DeltaAdminWindow>
    </DeltaAdminShell>
  );
}
