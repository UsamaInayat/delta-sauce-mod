"use client";

import type { ReactNode } from "react";
import { DeltaWindow } from "@/components/delta/delta-window";

type DeltaAdminWindowProps = {
  title: string;
  children: ReactNode;
  wide?: boolean;
};

export function DeltaAdminWindow({
  title,
  children,
  wide = false,
}: DeltaAdminWindowProps) {
  return (
    <DeltaWindow
      title={title}
      className={`al-admin-win${wide ? " al-admin-win-wide" : ""}`}
    >
      <div className="al-dialog-body al-admin-body">{children}</div>
    </DeltaWindow>
  );
}
