"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeltaShell } from "@/components/delta/delta-shell";
import { DeltaReadme } from "@/components/delta/delta-readme";
import { DeltaForm, type DeltaFormResult } from "@/components/delta/delta-form";
import { DeltaWindow } from "@/components/delta/delta-window";
import { MacGateDialog } from "@/components/delta/mac-gate-dialog";
import {
  isValidWalletOrEns,
  isValidXHandle,
} from "@/lib/wallet/validate";
import { formatLocalDateTime } from "@/lib/datetime/local-input";
import { gateFetch } from "@/lib/auth/gate-fetch";
import { usePoll } from "@/lib/hooks/use-poll";
import {
  hasRafflePasswordTabSession,
  markRafflePasswordTabSession,
} from "@/lib/auth/gate-browser-session";

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

export default function RaffleDetailClient({ slug }: { slug: string }) {
  const router = useRouter();
  const [raffle, setRaffle] = useState<RafflePayload | null>(null);
  const [wallet, setWallet] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DeltaFormResult>(null);
  const [walletError, setWalletError] = useState<string>();
  const [xError, setXError] = useState<string>();
  const [countdown, setCountdown] = useState("24:00:00");
  const [gateChecking, setGateChecking] = useState(true);
  const [gateRequired, setGateRequired] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [gateShake, setGateShake] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setGateChecking(true);
    setLoadError(null);
    void gateFetch(`/api/raffles/${slug}/gate/status`)
      .then(async (res) => {
        if (res.status === 401) {
          window.location.replace(
            `/raffles/unlock?next=${encodeURIComponent(`/raffles/${slug}`)}`,
          );
          return;
        }
        if (!res.ok) {
          setGateRequired(true);
          setGateUnlocked(false);
          setLoadError("Could not verify raffle access. Try again.");
          return;
        }
        const data = (await res.json()) as { required?: boolean; unlocked?: boolean };
        const required = data.required === true;
        setGateRequired(required);

        if (required && data.unlocked === true && !hasRafflePasswordTabSession(slug)) {
          await gateFetch(`/api/raffles/${slug}/lock`, { method: "POST" });
          setGateUnlocked(false);
          return;
        }

        setGateUnlocked(!required || data.unlocked === true);
      })
      .catch(() => {
        setGateRequired(true);
        setGateUnlocked(false);
        setLoadError("Could not verify raffle access. Try again.");
      })
      .finally(() => setGateChecking(false));
  }, [slug]);

  const handleUnauthorized = useCallback(async (res: Response) => {
    const data = (await res.json().catch(() => ({}))) as { code?: string };
    if (data.code === "RAFFLE_PASSWORD_REQUIRED") {
      setGateRequired(true);
      setGateUnlocked(false);
      setRaffle(null);
      return true;
    }
    window.location.replace(
      `/raffles/unlock?next=${encodeURIComponent(`/raffles/${slug}`)}`,
    );
    return true;
  }, [slug]);

  const load = useCallback(async (options?: { preserveForm?: boolean }) => {
    if (!slug || !gateUnlocked) return;
    setLoadError(null);
    const storedWallet = localStorage.getItem(`ds-wallet-${slug}`) ?? "";
    const res = await gateFetch(
      `/api/raffles/${slug}?wallet=${encodeURIComponent(storedWallet)}`,
    );
    if (res.status === 401) {
      await handleUnauthorized(res);
      return;
    }
    if (res.status === 404) {
      router.replace("/raffles");
      return;
    }
    if (!res.ok) {
      setLoadError("Could not load this raffle. Try again.");
      return;
    }
    const data = (await res.json()) as { raffle: RafflePayload };
    setRaffle(data.raffle);
    if (options?.preserveForm) return;
    if (data.raffle.userEntry) {
      setWallet(data.raffle.userEntry.walletEns ?? data.raffle.userEntry.walletAddress);
      setXHandle(data.raffle.userEntry.xHandle.replace(/^@/, ""));
    } else if (storedWallet) {
      setWallet(storedWallet);
    }
  }, [slug, gateUnlocked, handleUnauthorized, router]);

  const pollRaffle = useCallback(async () => {
    await load({ preserveForm: true });
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  usePoll(pollRaffle, undefined, gateUnlocked && !gateChecking);

  async function handleGateSubmit(event: FormEvent) {
    event.preventDefault();
    setGateError(null);
    setGateSubmitting(true);

    try {
      const res = await gateFetch(`/api/raffles/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: gatePassword.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGateError(data.error ?? "Sorry, that password is incorrect.");
        setGateShake(true);
        window.setTimeout(() => setGateShake(false), 450);
        return;
      }

      markRafflePasswordTabSession(slug);
      window.location.reload();
    } finally {
      setGateSubmitting(false);
    }
  }

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
      const res = await gateFetch(`/api/raffles/${slug}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, xHandle }),
      });
      const data = await res.json();
      if (res.status === 401) {
        await handleUnauthorized(res);
        return;
      }
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
      const res = await gateFetch(`/api/raffles/${slug}/entry`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet }),
      });
      const data = await res.json();
      if (res.status === 401) {
        await handleUnauthorized(res);
        return;
      }
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
        raffle.type === "FCFS" && (raffle.winnerCount ?? raffle.spotCap) != null
          ? `${raffle.entryCount} / ${raffle.winnerCount ?? raffle.spotCap} FILLED`
          : undefined,
      supply: "TBA",
      mintPrice: "TBA",
      dropDate: formatLocalDateTime(raffle.endsAt),
      usedFor: raffle.phase ?? raffle.type.replace(/_/g, " "),
      artist: raffle.artist ?? "DeltaSauce",
      eligibleCollections: raffle.collections.map((c) => c.name),
    };
  }, [raffle]);

  if (gateChecking) {
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

  if (gateRequired && !gateUnlocked) {
    return (
      <DeltaShell
        breadcrumb={[
          { label: "Raffles", href: "/raffles" },
        ]}
        pageTitle="Unlock Raffle"
        taskLabel="RAFFLE.EXE"
        showDesk={false}
      >
        <div className="al-gate-stage">
          <MacGateDialog
            shake={gateShake}
            configured
            password={gatePassword}
            error={gateError}
            submitting={gateSubmitting}
            onPasswordChange={setGatePassword}
            onSubmit={handleGateSubmit}
            onCancel={() => router.push("/raffles")}
          />
        </div>
      </DeltaShell>
    );
  }

  if (!raffle) {
    return (
      <DeltaShell
        breadcrumb={[{ label: "Raffles", href: "/raffles" }]}
        pageTitle={loadError ? "Error" : "Loading…"}
        taskLabel="RAFFLE.EXE"
      >
        <p className="al-empty-copy">{loadError ?? "Loading raffle…"}</p>
      </DeltaShell>
    );
  }

  return (
    <DeltaShell
      breadcrumb={[{ label: "Raffles", href: "/raffles" }]}
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
                  ? ` Opens ${formatLocalDateTime(raffle.startsAt)}.`
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
