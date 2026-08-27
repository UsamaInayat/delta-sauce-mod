import type { Metadata } from "next";
import Script from "next/script";
import "@/styles/delta-theme.css";

export const metadata: Metadata = {
  title: "Delta Sauce Raffles",
  description: "DeltaSauce raffle and allowlist platform",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="wf-loading">
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="" />
        <link rel="preconnect" href="https://p.typekit.net" crossOrigin="" />
      </head>
      <body>
        <Script
          id="typekit-loader"
          src="//use.typekit.net/ik/0zpeiyPQAScNkOgOEjUN9SR5k5TyYLg9qkC-J3H9MawfeGSgfFHN4UJLFRbh52jhWDjXZewkjcwUF2gyZcIoFQqtwcmqjhIUjsGMJ6NGjAUojW4qOAsTSagCjWq7f6RyR6JbMg6gJMJ7f6R8R6JbMg62JMJ7f6RKR6JbMg6OJMJ7f6RlR6JbMg6YJMJ7f6RcR6JbMg6FJMJ7f6R0R6JbMg6sJMHbM-VhnSbe.js"
          strategy="beforeInteractive"
        />
        <Script id="typekit-init" strategy="beforeInteractive">
          {`try { Typekit.load(); } catch (e) {} document.documentElement.classList.remove("wf-loading");`}
        </Script>
        {children}
      </body>
    </html>
  );
}
