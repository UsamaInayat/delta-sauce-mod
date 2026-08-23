import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.squarespace-cdn.com" },
      { protocol: "https", hostname: "i.seadn.io" },
      { protocol: "https", hostname: "openseauserdata.com" },
    ],
  },
};

export default nextConfig;
