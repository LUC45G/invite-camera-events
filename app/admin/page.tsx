import { isAdmin } from "@/lib/admin-auth";
import { AdminModeration } from "@/components/AdminModeration";
import { AdminLogin } from "@/components/AdminLogin";
import { getInstallationEvent } from "@/lib/event-context";
import { AdminExistingSetup } from "@/components/AdminExistingSetup";
import { sql } from "@/lib/db";
import { weddingEvent } from "@/lib/event-data";
import { AdminInitialSetup } from "@/components/AdminInitialSetup";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await isAdmin();

  if (!admin) return <AdminLogin />;

  const event = await getInstallationEvent();
  if (!event) {
    return <AdminInitialSetup suggestedStart={weddingEvent.weddingTimestamp} slug={weddingEvent.slug} />;
  }

  if (event.setup_complete === undefined) {
    return <main className="min-h-dvh bg-cream px-6 py-12 text-center"><h1 className="font-serif text-3xl">Actualizar la base de datos</h1><p className="mt-4">Ejecutá npm run db:migrate antes de configurar el evento. La migración conserva los datos existentes.</p></main>;
  }
  if (!event.setup_complete || event.deletion_pending) {
    const [counts] = await sql`
      SELECT
        (SELECT count(*)::int FROM photos WHERE event_id = ${event.id}) AS photos,
        (SELECT count(*)::int FROM table_qrs WHERE event_id = ${event.id}) AS families,
        (SELECT count(*)::int FROM guests WHERE event_id = ${event.id}) AS guests,
        (SELECT count(*)::int FROM upload_sessions WHERE event_id = ${event.id}) AS sessions
    `;
    return <AdminExistingSetup event={event} suggestedStart={event.starts_at ?? weddingEvent.weddingTimestamp} counts={counts as { photos: number; families: number; guests: number; sessions: number }} />;
  }

  return (
    <div className="admin-scroll">
      <AdminModeration slug={event.slug} eventName={event.name} accessMode={event.access_mode} publicToken={event.public_qr_token} sessionLimit={event.max_photos_per_session} />
    </div>
  );
}
