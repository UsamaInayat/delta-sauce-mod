"use client";

import type { MouseEventHandler, ReactNode } from "react";

type DeltaWindowProps = {
  title: string;
  icon?: "exe" | "txt";
  inactive?: boolean;
  children: ReactNode;
  className?: string;
  onClose?: MouseEventHandler<HTMLButtonElement>;
};

export function DeltaWindow({
  title,
  icon = "exe",
  inactive = false,
  children,
  className = "",
  onClose,
}: DeltaWindowProps) {
  return (
    <div className={`al-win${inactive ? " al-inactive" : ""}${className ? ` ${className}` : ""}`}>
      <div className="al-titlebar">
        <span className={`al-title-ico${icon === "txt" ? " al-ico-txt" : ""}`} aria-hidden="true" />
        <span className="al-title-text">{title}</span>
        <span className="al-title-btns">
          <span className="al-tbtn" aria-hidden="true">
            _
          </span>
          <span className="al-tbtn" aria-hidden="true">
            □
          </span>
          {onClose ? (
            <button
              type="button"
              className="al-tbtn al-tbtn-close"
              aria-label="Close"
              onClick={onClose}
            >
              ✕
            </button>
          ) : (
            <span className="al-tbtn" aria-hidden="true">
              ✕
            </span>
          )}
        </span>
      </div>
      {children}
    </div>
  );
}
