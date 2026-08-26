"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DeltaShell } from "@/components/delta/delta-shell";
import { MacGateDialog } from "@/components/delta/mac-gate-dialog";
import { gateFetch } from "@/lib/auth/gate-fetch";
import {
  hasPlatformGateTabSession,
  markPlatformGateTabSession,
} from "@/lib/auth/gate-browser-session";

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
  const [alreadyUnlocked, setAlreadyUnlocked] = useState(false);
  const [shake, setShake] = useState(false);

  const nextPath = normalizeNextPath(searchParams.get("next"));

  useEffect(() => {
    void gateFetch("/api/raffles/gate/status")
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

        if (data.unlocked === true && !hasPlatformGateTabSession()) {
          await gateFetch("/api/raffles/gate/lock", { method: "POST" });
          setAlreadyUnlocked(false);
          return;
        }

        setAlreadyUnlocked(data.unlocked === true);
      })
      .catch(() => setConfigured(false));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await gateFetch("/api/raffles/gate/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Incorrect password.");
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
        return;
      }

      markPlatformGateTabSession();
      window.location.replace(nextPath);
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
        {alreadyUnlocked ? (
          <div className="al-dialog-body">
            <p className="al-empty-copy">You are already unlocked.</p>
            <a
              href={nextPath}
              className="al-admin-btn primary"
              onClick={() => markPlatformGateTabSession()}
            >
              Continue to raffles
            </a>
          </div>
        ) : (
          <MacGateDialog
            shake={shake}
            configured={configured}
            password={password}
            error={error}
            submitting={submitting}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
          />
        )}
      </div>
    </DeltaShell>
  );
}
