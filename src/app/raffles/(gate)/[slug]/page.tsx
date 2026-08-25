import { redirect } from "next/navigation";
import { requireRaffleGate, RaffleGateError } from "@/lib/auth/raffle-gate";
import RaffleDetailClient from "./raffle-detail-client";

export const dynamic = "force-dynamic";

export default async function RaffleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    await requireRaffleGate();
  } catch (error) {
    if (error instanceof RaffleGateError) {
      redirect(
        `/raffles/unlock?next=${encodeURIComponent(`/raffles/${slug}`)}`,
      );
    }
    throw error;
  }

  return <RaffleDetailClient slug={slug} />;
}
