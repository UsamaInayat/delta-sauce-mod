import { Suspense } from "react";
import RaffleUnlockPage from "./unlock-client";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="arena-portfolio-wrapper">
          <p className="al-empty-copy">Loading…</p>
        </div>
      }
    >
      <RaffleUnlockPage />
    </Suspense>
  );
}
