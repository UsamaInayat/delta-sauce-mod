"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { DeltaDesk } from "@/components/delta/delta-desk";
import { RafaelBranding, RafaelSticker } from "@/components/delta/rafael-branding";

export type DeltaBreadcrumb = {
  label: string;
  href?: string;
};

type DeltaShellProps = {
  children: ReactNode;
  breadcrumb: DeltaBreadcrumb[];
  pageTitle: string;
  taskLabel?: string;
  showDesk?: boolean;
};

function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString(undefined, {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    }
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  return <span className="al-clock">{time || "--:--"}</span>;
}

export function DeltaShell({
  children,
  breadcrumb,
  pageTitle,
  taskLabel = "ALLOWLIST.EXE",
  showDesk = true,
}: DeltaShellProps) {
  return (
    <div className="arena-portfolio-wrapper">
      <div className="al-ceiling" aria-hidden="true">
        <span className="al-lightpanel" />
        <span className="al-lightpanel" />
        <span className="al-lightpanel" />
      </div>

      <header className="arena-header">
        <nav className="arena-header-nav" aria-label="Breadcrumb">
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`} style={{ display: "contents" }}>
              {index > 0 ? <span className="arena-header-separator">/</span> : null}
              {item.href ? (
                <Link href={item.href} className="arena-site-title">
                  {item.label}
                </Link>
              ) : (
                <span className="arena-page-title">{item.label}</span>
              )}
            </span>
          ))}
          {breadcrumb.length > 0 ? <span className="arena-header-separator">/</span> : null}
          <span className="arena-page-title">{pageTitle}</span>
        </nav>
      </header>

      <div className="al-scene">
        <div className="al-setup">
          <div className="al-wallclock" aria-hidden="true" />

          <div className="al-monitor">
            <RafaelSticker />
            <div className="al-sticky" aria-hidden="true">
              mint
              <br />
              soon !!
            </div>
            <div className="al-screen-frame">
              <div className="al-screen">
                <div className="al-desktop">{children}</div>
                <div className="al-taskbar">
                  <div className="al-start">
                    <span className="al-start-flag" aria-hidden="true" />
                    Start
                  </div>
                  <div className="al-task">{taskLabel}</div>
                  <RafaelBranding />
                  <LiveClock />
                </div>
                <div className="al-crt" aria-hidden="true" />
                <div className="al-glass" aria-hidden="true" />
              </div>
            </div>
            <div className="al-chin">
              <div className="al-vents" aria-hidden="true" />
              <div className="al-brand">PEPENTOSH</div>
              <div className="al-chin-right">
                <div className="al-power" aria-hidden="true" />
                <div className="al-led" aria-hidden="true" title="Power on" />
              </div>
            </div>
          </div>

          {showDesk ? <DeltaDesk /> : null}
        </div>

        <div className="al-floor" aria-hidden="true" />
      </div>
    </div>
  );
}
