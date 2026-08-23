import AdminRaffleForm from "@/components/admin/admin-raffle-form";

export default async function EditRafflePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminRaffleForm raffleId={id} />;
}
