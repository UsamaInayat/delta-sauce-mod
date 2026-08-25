import { redirect } from "next/navigation";
import { RaffleGateShell } from "@/components/delta/raffle-gate-shell";
import { requireRaffleGate, RaffleGateError } from "@/lib/auth/raffle-gate";

export const dynamic = "force-dynamic";

export default async function RaffleGateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRaffleGate();
  } catch (error) {
    if (error instanceof RaffleGateError) {
      redirect("/raffles/unlock");
    }
    throw error;
  }

  return <RaffleGateShell>{children}</RaffleGateShell>;
}
