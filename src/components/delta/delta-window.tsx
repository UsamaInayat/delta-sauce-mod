"use client";

import type { ReactNode } from "react";

type DeltaWindowProps = {
  title: string;
  icon?: "exe" | "txt";
  inactive?: boolean;
  children: ReactNode;
  className?: string;
};

export function DeltaWindow({
  title,
  icon = "exe",
  inactive = false,
  children,
  className = "",
}: DeltaWindowProps) {
  return (
    <div className={`al-win${inactive ? " al-inactive" : ""}${className ? ` ${className}` : ""}`}>
      <div className="al-titlebar">
        <span className={`al-title-ico${icon === "txt" ? " al-ico-txt" : ""}`} aria-hidden="true" />
        <span className="al-title-text">{title}</span>
        <span className="al-title-btns" aria-hidden="true">
          <span className="al-tbtn">_</span>
          <span className="al-tbtn">□</span>
          <span className="al-tbtn">✕</span>
        </span>
      </div>
      {children}
    </div>
  );
}
