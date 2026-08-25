import { redirect } from "next/navigation";
import { requireRaffleGate, RaffleGateError } from "@/lib/auth/raffle-gate";

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

  return children;
}
