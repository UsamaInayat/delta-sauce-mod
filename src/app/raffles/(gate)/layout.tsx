import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { RaffleGateShell } from "@/components/delta/raffle-gate-shell";
import { requireRaffleGate, RaffleGateError } from "@/lib/auth/raffle-gate";

export const dynamic = "force-dynamic";

async function unlockRedirectPath() {
  const h = await headers();
  const next = h.get("x-raffle-next") ?? "/raffles";
  return `/raffles/unlock?next=${encodeURIComponent(next)}`;
}

export default async function RaffleGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRaffleGate();
  } catch (error) {
    if (error instanceof RaffleGateError) {
      redirect(await unlockRedirectPath());
    }
    throw error;
  }

  return <RaffleGateShell>{children}</RaffleGateShell>;
}
