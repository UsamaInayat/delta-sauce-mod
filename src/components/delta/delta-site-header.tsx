"use client";

import Image from "next/image";
import Link from "next/link";
import {
  DELTA_SITE_CART_HREF,
  DELTA_SITE_LOGIN_HREF,
  DELTA_SITE_NAV,
  DELTA_SITE_SOCIAL,
  type SiteNavItem,
} from "@/components/delta/delta-site-nav";

function NavLink({
  href,
  label,
  external,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  const className = "delta-site-nav-link";
  const offSite = href.startsWith("http") && !href.startsWith("https://deltasauceart.com");

  if (external || offSite) {
    return (
      <a href={href} className={className} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
    );
  }

  if (href.startsWith("http")) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

function NavFolder({ item }: { item: Extract<SiteNavItem, { type: "folder" }> }) {
  const { folder } = item;
  return (
    <div className="delta-site-nav-folder">
      {folder.href ? (
        <a href={folder.href} className="delta-site-nav-folder-title">
          {folder.label}
        </a>
      ) : (
        <span className="delta-site-nav-folder-title">{folder.label}</span>
      )}
      <div className="delta-site-nav-folder-menu">
        {folder.items.map((link) => (
          <NavLink key={link.label} {...link} />
        ))}
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 110 110" aria-hidden="true" className="delta-site-header-icon">
      <path
        fill="currentColor"
        d="M55 27.5c-7.2 0-8.1 0-10.9.1-2.8.1-4.7.6-6.4 1.3-1.7.7-3.2 1.6-4.6 3-1.4 1.4-2.3 2.9-3 4.6-.7 1.7-1.2 3.6-1.3 6.4-.1 2.8-.1 3.7-.1 10.9s0 8.1.1 10.9c.1 2.8.6 4.7 1.3 6.4.7 1.7 1.6 3.2 3 4.6 1.4 1.4 2.9 2.3 4.6 3 1.7.7 3.6 1.2 6.4 1.3 2.8.1 3.7.1 10.9.1s8.1 0 10.9-.1c2.8-.1 4.7-.6 6.4-1.3 1.7-.7 3.2-1.6 4.6-3 1.4-1.4 2.3-2.9 3-4.6.7-1.7 1.2-3.6 1.3-6.4.1-2.8.1-3.7.1-10.9s0-8.1-.1-10.9c-.1-2.8-.6-4.7-1.3-6.4-.7-1.7-1.6-3.2-3-4.6-1.4-1.4-2.9-2.3-4.6-3-1.7-.7-3.6-1.2-6.4-1.3-2.8-.1-3.7-.1-10.9-.1zm0 4.8c7.1 0 7.9 0 10.7.1 2.6.1 4 .5 4.9.8 1.2.5 2.1 1.1 3 2 .9.9 1.5 1.8 2 3 .3.9.7 2.3.8 4.9.1 2.8.1 3.6.1 10.7s0 7.9-.1 10.7c-.1 2.6-.5 4-.8 4.9-.5 1.2-1.1 2.1-2 3-.9.9-1.8 1.5-3 2-.9.3-2.3.7-4.9.8-2.8.1-3.6.1-10.7.1s-7.9 0-10.7-.1c-2.6-.1-4-.5-4.9-.8-1.2-.5-2.1-1.1-3-2-.9-.9-1.5-1.8-2-3-.3-.9-.7-2.3-.8-4.9-.1-2.8-.1-3.6-.1-10.7s0-7.9.1-10.7c.1-2.6.5-4 .8-4.9.5-1.2 1.1-2.1 2-3 .9-.9 1.8-1.5 3-2 .9-.3 2.3-.7 4.9-.8 2.8-.1 3.6-.1 10.7-.1zm0 12.2a17.5 17.5 0 1 0 0 35 17.5 17.5 0 0 0 0-35zm0 28.9a11.4 11.4 0 1 1 0-22.8 11.4 11.4 0 0 1 0 22.8zm22.4-29.7a4.1 4.1 0 1 1-8.2 0 4.1 4.1 0 0 1 8.2 0z"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 110 110" aria-hidden="true" className="delta-site-header-icon">
      <path
        fill="currentColor"
        d="M68.5 24.4h8.9L58.8 44.6 81 85.6h-17l-13.3-17.4-15.2 17.4H27l20.8-23.8L27.2 24.4h17.4l12 16 13.9-16zM65.8 79.2h4.9L44.7 29.4h-5.3l26.4 49.8z"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 128 104" aria-hidden="true" className="delta-site-header-icon delta-site-header-icon-cart">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M52.0285 0.596038C53.7706 1.71598 54.275 4.03616 53.1551 5.7783L36.7801 31.2505H90.7213L74.3463 5.7783C73.2264 4.03616 73.7308 1.71598 75.4729 0.596038C77.215 -0.523908 79.5352 -0.0195218 80.6552 1.72262L99.6373 31.2505H122.5C125.805 31.2505 128.201 34.4008 127.318 37.5862L109.991 100.086C109.391 102.252 107.42 103.75 105.173 103.75H22.33C20.083 103.75 18.112 102.252 17.5117 100.086L0.184604 37.5862C-0.698501 34.4008 1.69731 31.2505 5.00287 31.2505H27.8641L46.8463 1.72262C47.9662 -0.0195218 50.2864 -0.523908 52.0285 0.596038Z"
      />
    </svg>
  );
}

export function DeltaSiteHeader() {
  return (
    <header className="delta-site-header">
      <div className="delta-site-header-inner">
        <div className="delta-site-header-left">
          <Link href="https://deltasauceart.com/" className="delta-site-header-link">
            <Image
              src="/deltasauce-logo.png"
              alt="Delta Sauce"
              width={180}
              height={28}
              className="delta-site-header-logo"
              priority
            />
          </Link>

          <nav className="delta-site-nav" aria-label="Main">
            <div className="delta-site-nav-list">
              {DELTA_SITE_NAV.map((item) =>
                item.type === "link" ? (
                  <div key={item.label} className="delta-site-nav-item">
                    <NavLink href={item.href} label={item.label} external={item.external} />
                  </div>
                ) : (
                  <div key={item.folder.label} className="delta-site-nav-item delta-site-nav-item-folder">
                    <NavFolder item={item} />
                  </div>
                ),
              )}
            </div>
          </nav>
        </div>

        <div className="delta-site-header-actions">
          <a href={DELTA_SITE_LOGIN_HREF} className="delta-site-nav-link delta-site-login">
            Login
          </a>

          <div className="delta-site-header-social">
            {DELTA_SITE_SOCIAL.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="delta-site-header-icon-link"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
              >
                {social.label === "Instagram" ? <InstagramIcon /> : <XIcon />}
              </a>
            ))}
          </div>

          <a href={DELTA_SITE_CART_HREF} className="delta-site-header-cart" aria-label="Cart">
            <CartIcon />
            <span className="delta-site-header-cart-qty">0</span>
          </a>
        </div>
      </div>
    </header>
  );
}
