"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const ADMIN_TABS = [
  { label: "Create Raffle", href: "/admin/raffles/new" },
  { label: "Winners", href: "/admin/winners" },
  { label: "Snapshots", href: "/admin/snapshots" },
  { label: "Saved Raffles", href: "/admin/raffles" },
] as const;

type DeltaAdminShellProps = {
  children: ReactNode;
  pageTitle?: string;
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

export function DeltaAdminShell({ children, pageTitle = "Admin" }: DeltaAdminShellProps) {
  const pathname = usePathname();

  return (
    <div className="delta-admin-shell">
      <div className="al-ceiling" aria-hidden="true">
        <span className="al-lightpanel" />
        <span className="al-lightpanel" />
        <span className="al-lightpanel" />
      </div>

      <header className="arena-header">
        <nav className="arena-header-nav" aria-label="Admin navigation">
          <Link href="/" className="arena-site-title">
            DeltaSauce
          </Link>
          <span className="arena-header-separator">/</span>
          <span className="arena-page-title">{pageTitle}</span>
        </nav>
      </header>

      <nav aria-label="Admin sections">
        <ul className="al-admin-tabs">
          {ADMIN_TABS.map((tab) => {
            const active =
              pathname === tab.href ||
              (tab.href !== "/admin/raffles/new" && pathname.startsWith(tab.href));

            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={`al-admin-tab${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="al-scene">
        <div className="al-setup">
          <div className="al-wallclock" aria-hidden="true" />

          <div className="al-monitor">
            <div className="al-sticky" aria-hidden="true">
              admin
              <br />
              mode
            </div>
            <div className="al-screen-frame">
              <div className="al-screen">
                <div className="al-desktop">
                  <div className="al-windows al-windows-single al-admin-stage">
                    {children}
                  </div>
                </div>
                <div className="al-taskbar">
                  <div className="al-start">
                    <span className="al-start-flag" aria-hidden="true" />
                    Start
                  </div>
                  <div className="al-task">ADMIN.EXE</div>
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

          <div className="al-desk" aria-hidden="true" />
          <div className="al-leg al-leg-left" aria-hidden="true" />
          <div className="al-leg al-leg-right" aria-hidden="true" />
        </div>

        <div className="al-floor" aria-hidden="true" />
      </div>
    </div>
  );
}
