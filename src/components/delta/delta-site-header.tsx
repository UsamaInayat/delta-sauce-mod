import Image from "next/image";
import Link from "next/link";

export function DeltaSiteHeader() {
  return (
    <header className="delta-site-header">
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
    </header>
  );
}
