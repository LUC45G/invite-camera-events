import { sql, type Event } from "@/lib/db";
import { env } from "@/lib/env";
import { selectInstallationEvent } from "./event-selection";

export async function getInstallationEvent(): Promise<Event | null> {
  const events = (await sql`
    SELECT * FROM events
    WHERE slug = ${env.EVENT_SLUG}
      AND deployment_id = ${env.DEPLOYMENT_ID}
      AND hostname = ${env.EVENT_HOSTNAME}
    LIMIT 2
  `) as Event[];
  return selectInstallationEvent(events);
}

export async function getAdminEvent(requestedSlug?: string | null, allowPending = false): Promise<Event | null> {
  const event = await getInstallationEvent();
  if (requestedSlug && event?.slug !== requestedSlug) return null;
  if (!allowPending && event && (event.setup_complete === false || event.deletion_pending)) return null;
  return event;
}

export async function getAdminInvitationEvent(requestedSlug?: string | null): Promise<Event | null> {
  const event = await getAdminEvent(requestedSlug);
  return event?.access_mode === "public_qr" ? null : event;
}
