import { sql, type Event } from "@/lib/db";
import { selectInstallationEvent } from "./event-selection";

export async function getInstallationEvent(): Promise<Event | null> {
  const events = (await sql`SELECT * FROM events ORDER BY created_at, id LIMIT 2`) as Event[];
  return selectInstallationEvent(events);
}

export async function getAdminEvent(requestedSlug?: string | null): Promise<Event | null> {
  const event = await getInstallationEvent();
  if (requestedSlug && event?.slug !== requestedSlug) return null;
  return event;
}
