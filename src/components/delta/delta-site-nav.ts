export type SiteNavLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type SiteNavFolder = {
  label: string;
  href?: string;
  items: SiteNavLink[];
};

export type SiteNavItem =
  | { type: "link"; label: string; href: string; external?: boolean }
  | { type: "folder"; folder: SiteNavFolder };

const SITE = "https://deltasauceart.com";

/** Mirrors deltasauceart.com header nav (Aug 2026). */
export const DELTA_SITE_NAV: SiteNavItem[] = [
  { type: "link", label: "HOME", href: `${SITE}/` },
  {
    type: "folder",
    folder: {
      label: "DROPS",
      href: `${SITE}/drops`,
      items: [
        { label: "Issues with 8NAP", href: `${SITE}/issues` },
        { label: "Braindrops", href: `${SITE}/bdviews` },
        { label: "Dusk till Dawn", href: `${SITE}/dusktilldawn` },
      ],
    },
  },
  {
    type: "folder",
    folder: {
      label: "COLLECTIONS",
      href: `${SITE}/collections-1`,
      items: [{ label: "Explore / All", href: `${SITE}/explore/all` }],
    },
  },
  {
    type: "folder",
    folder: {
      label: "NFT",
      href: `${SITE}/nft`,
      items: [
        {
          label: "OpenSea",
          href: "https://opensea.io/DeltaSauce/created?sortBy=floorPrice",
          external: true,
        },
        {
          label: "SuperRare",
          href: "https://superrare.com/deltasauce",
          external: true,
        },
        {
          label: "Objkt",
          href: "https://objkt.com/profile/deltasauce/created",
          external: true,
        },
        {
          label: "Ninfa",
          href: "https://ninfa.io/@DeltaSauce",
          external: true,
        },
        { label: "Raffles", href: "/raffles" },
      ],
    },
  },
  { type: "link", label: "SHOP", href: `${SITE}/shop-home/art-prints` },
  { type: "link", label: "EXHIBITIONS", href: `${SITE}/exhibitions` },
  { type: "link", label: "ARTIST BIO", href: `${SITE}/bio` },
  { type: "link", label: "CONTACT", href: `${SITE}/contact` },
];

export const DELTA_SITE_SOCIAL = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/delta.sauce",
  },
  {
    label: "X",
    href: "https://x.com/deltasauce",
  },
] as const;

export const DELTA_SITE_LOGIN_HREF = `${SITE}/`;
export const DELTA_SITE_CART_HREF = `${SITE}/cart`;
