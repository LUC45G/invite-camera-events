import { isAdmin } from "@/lib/admin-auth";
import { AdminModeration } from "@/components/AdminModeration";
import { AdminLogin } from "@/components/AdminLogin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await isAdmin();

  if (!admin) return <AdminLogin />;

  return <AdminModeration />;
}
