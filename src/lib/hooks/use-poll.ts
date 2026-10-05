"use client";

import { useEffect } from "react";

/** Default when callers do not override (keep user traffic off the DB). */
export const POLL_MS = 20_000;

export function usePoll(
  callback: () => void | Promise<void>,
  intervalMs: number = POLL_MS,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    let active = true;

    const run = () => {
      if (active) void callback();
    };

    run();

    if (intervalMs <= 0) {
      const onFocus = () => run();
      const onVisibility = () => {
        if (document.visibilityState === "visible") run();
      };
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        active = false;
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

    const intervalId = window.setInterval(run, intervalMs);
    const onFocus = () => run();
    const onVisibility = () => {
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [callback, intervalMs, enabled]);
}

export function publicRaffleListPollMs(
  folders: Array<{ lifecycle: string }>,
): number {
  if (folders.some((f) => f.lifecycle === "LIVE")) return 20_000;
  if (folders.some((f) => f.lifecycle === "SCHEDULED")) return 60_000;
  return 5 * 60_000;
}

export function raffleDetailPollMs(
  lifecycle: string | undefined,
  enterable: boolean | undefined,
): number {
  if (!lifecycle) return 30_000;
  if (lifecycle === "LIVE" && enterable) return 20_000;
  if (lifecycle === "SCHEDULED") return 60_000;
  if (lifecycle === "ENDED") return 30_000;
  return 0;
}
