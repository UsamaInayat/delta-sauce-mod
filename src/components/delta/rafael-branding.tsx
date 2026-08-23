import Image from "next/image";

export const RAFAEL_X_URL = "https://x.com/userafaelbot";

export function RafaelSticker() {
  return (
    <a
      href={RAFAEL_X_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="al-rafael-sticker"
      aria-label="Powered by Rafael on X"
      title="Powered by Rafael"
    >
      <Image
        src="/rafael-logo.png"
        alt=""
        width={28}
        height={28}
        className="al-rafael-sticker-logo"
        aria-hidden
      />
    </a>
  );
}

export function RafaelBranding() {
  return (
    <a
      href={RAFAEL_X_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="al-rafael-brand"
      aria-label="Powered by Rafael on X"
    >
      <span className="al-rafael-text">Powered by Rafael</span>
    </a>
  );
}
