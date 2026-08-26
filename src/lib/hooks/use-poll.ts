"use client";

import { useEffect } from "react";

export const POLL_MS = 3_000;

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
