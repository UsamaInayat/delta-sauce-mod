import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";

export default async function AdminIndex() {
  const user = await getAdminSession();
  redirect(user ? "/admin/raffles" : "/admin/login");
}
