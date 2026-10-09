import { isAdmin } from "@/lib/admin-auth";
import { AdminModeration } from "@/components/AdminModeration";
import { AdminLogin } from "@/components/AdminLogin";
import { getInstallationEvent } from "@/lib/event-context";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await isAdmin();

  if (!admin) return <AdminLogin />;

  const event = await getInstallationEvent();
  if (!event) {
    return <main className="min-h-dvh bg-cream px-6 py-12 text-center"><h1 className="font-serif text-3xl">Configurar el evento</h1><p className="mt-4">Todavía no hay un evento configurado.</p></main>;
  }

  return (
    <div className="admin-scroll">
      <AdminModeration slug={event.slug} />
    </div>
  );
}
