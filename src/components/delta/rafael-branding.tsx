import Image from "next/image";

export function RafaelBranding() {
  return (
    <div className="al-rafael-brand" aria-label="Powered by Rafael">
      <Image
        src="/rafael-logo.png"
        alt=""
        width={16}
        height={16}
        className="al-rafael-logo"
        aria-hidden
      />
      <span className="al-rafael-text">Powered by Rafael</span>
    </div>
  );
}
