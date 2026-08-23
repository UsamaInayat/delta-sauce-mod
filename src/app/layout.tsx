import type { Metadata } from "next";
import "@/styles/delta-theme.css";

export const metadata: Metadata = {
  title: "Delta Sauce Raffles",
  description: "DeltaSauce raffle and allowlist platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
