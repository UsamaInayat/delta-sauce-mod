"use client";

import type { ReactNode } from "react";
import { RaffleGateWatcher } from "@/components/delta/raffle-gate-watcher";

export function RaffleGateShell({ children }: { children: ReactNode }) {
  return (
    <>
      <RaffleGateWatcher />
      {children}
    </>
  );
}
