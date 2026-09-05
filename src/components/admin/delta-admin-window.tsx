"use client";

import type { MouseEventHandler, ReactNode } from "react";
import { DeltaWindow } from "@/components/delta/delta-window";

type DeltaAdminWindowProps = {
  title: string;
  children: ReactNode;
  wide?: boolean;
  onClose?: MouseEventHandler<HTMLButtonElement>;
};

export function DeltaAdminWindow({
  title,
  children,
  wide = false,
  onClose,
}: DeltaAdminWindowProps) {
  return (
    <DeltaWindow
      title={title}
      className={`al-admin-win${wide ? " al-admin-win-wide" : ""}`}
      onClose={onClose}
    >
      <div className="al-dialog-body al-admin-body">{children}</div>
    </DeltaWindow>
  );
}
