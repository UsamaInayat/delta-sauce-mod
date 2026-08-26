"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RaffleGateWatcher } from "@/components/delta/raffle-gate-watcher";
import { hasPlatformGateTabSession } from "@/lib/auth/gate-browser-session";
import { gateFetch } from "@/lib/auth/gate-fetch";

export function RaffleGateShell({ children }: { children: ReactNode }) {
  const [verified, setVerified] = useState(false);
  const [gateEnabled, setGateEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    async function verifyTabSession() {
      try {
        const res = await gateFetch("/api/raffles/gate/status");
        if (!res.ok || !active) {
          setVerified(true);
          return;
        }

        const data = (await res.json()) as { enabled?: boolean; unlocked?: boolean };
        if (data.enabled === false) {
          setGateEnabled(false);
          setVerified(true);
          return;
        }

        setGateEnabled(true);

        if (data.unlocked === true && !hasPlatformGateTabSession()) {
          await gateFetch("/api/raffles/gate/lock", { method: "POST" });
          const next = encodeURIComponent(
            window.location.pathname + window.location.search,
          );
          window.location.assign(`/raffles/unlock?next=${next}`);
          return;
        }
      } catch {
        // fall through and render; server gate still applies
      }

      if (active) setVerified(true);
    }

    void verifyTabSession();

    return () => {
      active = false;
    };
  }, []);

  if (!verified) return null;

  return (
    <>
      {gateEnabled ? <RaffleGateWatcher /> : null}
      {children}
    </>
  );
}
