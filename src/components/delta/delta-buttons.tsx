"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type DeltaButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary";
  children: ReactNode;
};

export function DeltaButton({
  variant = "default",
  className = "",
  children,
  ...props
}: DeltaButtonProps) {
  return (
    <button
      type="button"
      className={`al-btn${variant === "primary" ? " al-default" : ""}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function DeltaButtonRow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`al-btnrow${className ? ` ${className}` : ""}`}>{children}</div>;
}
