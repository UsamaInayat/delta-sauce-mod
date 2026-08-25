"use client";

import { useEffect } from "react";

const POLL_MS = 2500;

export function RaffleGateWatcher() {
  useEffect(() => {
    let active = true;
    let wasUnlocked = true;

    async function check() {
      try {
        const res = await fetch("/api/raffles/gate/status", { cache: "no-store" });
        if (!res.ok || !active) return;

        const data = (await res.json()) as { unlocked?: boolean };
        const unlocked = data.unlocked === true;

        if (wasUnlocked && !unlocked) {
          const next = encodeURIComponent(
            window.location.pathname + window.location.search,
          );
          window.location.assign(`/raffles/unlock?next=${next}`);
          return;
        }

        wasUnlocked = unlocked;
      } catch {
        // ignore transient network errors
      }
    }

    void check();

    const intervalId = window.setInterval(() => void check(), POLL_MS);
    const onFocus = () => void check();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void check();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
