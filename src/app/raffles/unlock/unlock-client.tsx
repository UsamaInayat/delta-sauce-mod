"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DeltaShell } from "@/components/delta/delta-shell";
import { MacGateDialog } from "@/components/delta/mac-gate-dialog";

function normalizeNextPath(path: string | null) {
  if (!path || path === "/") return "/raffles";
  if (!path.startsWith("/raffles")) return "/raffles";
  return path;
}

export default function RaffleUnlockPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [shake, setShake] = useState(false);

  const nextPath = normalizeNextPath(searchParams.get("next"));

  useEffect(() => {
    void fetch("/api/raffles/gate/status", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          setConfigured(false);
          return;
        }
        const data = (await res.json()) as {
          configured?: boolean;
          unlocked?: boolean;
        };
        setConfigured(data.configured !== false);
        if (data.unlocked === true) {
          window.location.replace(nextPath);
        }
      })
      .catch(() => setConfigured(false));
  }, [nextPath]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/raffles/gate/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Incorrect password.");
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
        return;
      }

      window.location.assign(nextPath);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DeltaShell
      breadcrumb={[{ label: "Raffles" }]}
      pageTitle="Unlock"
      taskLabel="SECURITY.DSK"
      showDesk={false}
    >
      <div className="al-gate-stage">
        <MacGateDialog
          shake={shake}
          configured={configured}
          password={password}
          error={error}
          submitting={submitting}
          onPasswordChange={setPassword}
          onSubmit={handleSubmit}
        />
      </div>
    </DeltaShell>
  );
}
