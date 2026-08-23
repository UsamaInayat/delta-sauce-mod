"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DeltaShell } from "@/components/delta/delta-shell";
import { DeltaReadme } from "@/components/delta/delta-readme";
import { DeltaForm, type DeltaFormResult } from "@/components/delta/delta-form";
import { DeltaWindow } from "@/components/delta/delta-window";
import {
  isValidWalletOrEns,
  isValidXHandle,
} from "@/lib/wallet/validate";

type RafflePayload = {
  slug: string;
  title: string;
  phase: string | null;
  artist: string | null;
  description: string;
  type: string;
  chain: string;
  startsAt: string | null;
  endsAt: string | null;
  winnerCount: number | null;
  spotCap: number | null;
  tokenGated: boolean;
  lifecycle: string;
  enterable: boolean;
  collections: Array<{ name: string }>;
  entryCount: number;
  userEntry?: {
    walletAddress: string;
    walletEns: string | null;
    xHandle: string;
    status: string;
  } | null;
  result?: {
    finalized: boolean;
    won: boolean;
    lost: boolean;
    wallet: string;
  } | null;
};

function formatDropDate(iso: string | null) {
  if (!iso) return "TBA";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function RaffleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const [slug, setSlug] = useState<string>("");
  const [raffle, setRaffle] = useState<RafflePayload | null>(null);
  const [wallet, setWallet] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DeltaFormResult>(null);
  const [walletError, setWalletError] = useState<string>();
  const [xError, setXError] = useState<string>();
  const [countdown, setCountdown] = useState("24:00:00");

  useEffect(() => {
    void params.then((p) => setSlug(p.slug));
  }, [params]);

  const load = useCallback(async () => {
    if (!slug) return;
    const storedWallet = localStorage.getItem(`ds-wallet-${slug}`) ?? "";
    const res = await fetch(`/api/raffles/${slug}?wallet=${encodeURIComponent(storedWallet)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { raffle: RafflePayload };
    setRaffle(data.raffle);
    if (data.raffle.userEntry) {
      setWallet(data.raffle.userEntry.walletEns ?? data.raffle.userEntry.walletAddress);
      setXHandle(data.raffle.userEntry.xHandle.replace(/^@/, ""));
    } else if (storedWallet) {
      setWallet(storedWallet);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!raffle?.endsAt) return;
    const tick = () => {
      const ms = new Date(raffle.endsAt!).getTime() - Date.now();
      const total = Math.max(0, Math.floor(ms / 1000));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [raffle?.endsAt]);

  const resolveEns = useCallback(async (ens: string) => {
    const res = await fetch(`/api/ens/resolve?q=${encodeURIComponent(ens)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: string };
    return data.address ?? null;
  }, []);

  async function submitEntry() {
    setWalletError(undefined);
    setXError(undefined);
    setResult(null);

    if (!isValidWalletOrEns(wallet)) {
      setWalletError("Enter a valid ETH address (0x…) or ENS name.");
      return;
    }
    if (!isValidXHandle(xHandle)) {
      setXError("Enter a valid X handle.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/raffles/${slug}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, xHandle }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: "err", message: data.error ?? "Submission failed." });
        return;
      }
      localStorage.setItem(`ds-wallet-${slug}`, wallet.trim());
      setResult({
        kind: "ok",
        message: raffle?.userEntry
          ? "Entry updated successfully."
          : "You're in. Good luck.",
      });
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelEntry() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/raffles/${slug}/entry`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ kind: "err", message: data.error ?? "Could not cancel." });
        return;
      }
      localStorage.removeItem(`ds-wallet-${slug}`);
      setWallet("");
      setXHandle("");
      setResult({ kind: "ok", message: "Entry cancelled." });
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  const readme = useMemo(() => {
    if (!raffle) return null;
    return {
      about: raffle.description.replace(/<[^>]+>/g, "").slice(0, 500),
      status: raffle.lifecycle,
      statusOpen: raffle.enterable,
      chain: raffle.chain,
      entries: raffle.userEntry ? "1 PER WALLET" : "1 PER WALLET",
      spots:
        raffle.spotCap != null
          ? `${raffle.entryCount} / ${raffle.spotCap} FILLED`
          : undefined,
      supply: "TBA",
      mintPrice: "TBA",
      dropDate: formatDropDate(raffle.endsAt),
      usedFor: raffle.phase ?? raffle.type.replace(/_/g, " "),
      artist: raffle.artist ?? "DeltaSauce",
      eligibleCollections: raffle.collections.map((c) => c.name),
    };
  }, [raffle]);

  if (!raffle) {
    return (
      <DeltaShell
        breadcrumb={[{ label: "Raffles", href: "/raffles" }]}
        pageTitle="Loading…"
        taskLabel="RAFFLE.EXE"
      >
        <p className="al-empty-copy">Loading raffle…</p>
      </DeltaShell>
    );
  }

  return (
    <DeltaShell
      breadcrumb={[
        { label: "Raffles", href: "/raffles" },
        { label: raffle.title },
      ]}
      pageTitle={raffle.title}
      taskLabel="RAFFLE.EXE"
    >
      <div className="al-icons" aria-hidden="true">
        <Link href="/raffles" className="al-icon">
          <span className="al-icon-img al-icon-folderimg" />
          <span className="al-icon-label">RAFFLES</span>
        </Link>
        <div className="al-icon al-selected">
          <span className="al-icon-img al-icon-exe" />
          <span className="al-icon-label">ENTER.EXE</span>
        </div>
      </div>

      <div className="al-windows">
        {readme ? <DeltaReadme details={readme} inactive /> : null}

        {raffle.result?.finalized ? (
          <DeltaWindow title="Results — DeltaSauce">
            <div className="al-dialog-body">
              {raffle.result.won ? (
                <div className="arena-result show ok">
                  <span className="al-msgicon" />
                  <span>
                    You won this raffle for wallet{" "}
                    <strong>{raffle.result.wallet}</strong>.
                  </span>
                </div>
              ) : (
                <div className="arena-result show err">
                  <span className="al-msgicon" />
                  <span>
                    This raffle has ended. Wallet{" "}
                    <strong>{raffle.result.wallet}</strong> was not selected.
                  </span>
                </div>
              )}
            </div>
          </DeltaWindow>
        ) : raffle.enterable ? (
          <DeltaForm
            title={`Enter ${raffle.title}`}
            subtitle="One wallet, one entry. Already registered? Submit again to update."
            walletValue={wallet}
            xHandleValue={xHandle}
            onWalletChange={setWallet}
            onXHandleChange={setXHandle}
            onResolveEns={resolveEns}
            onSubmit={submitEntry}
            onCancel={raffle.userEntry ? cancelEntry : undefined}
            showUpdate={Boolean(raffle.userEntry)}
            submitting={submitting}
            result={result}
            walletError={walletError}
            xHandleError={xError}
            footerNote="Your entry is verified on-chain when token gating applies."
          />
        ) : (
          <DeltaWindow title="Entries Closed">
            <div className="al-dialog-body">
              <p className="arena-form-sub">
                This raffle is <strong>{raffle.lifecycle.toLowerCase()}</strong>.
                {raffle.lifecycle === "SCHEDULED"
                  ? ` Opens ${formatDropDate(raffle.startsAt)}.`
                  : null}
              </p>
              <p className="al-countdown-display">Ends in {countdown}</p>
            </div>
          </DeltaWindow>
        )}
      </div>
    </DeltaShell>
  );
}
