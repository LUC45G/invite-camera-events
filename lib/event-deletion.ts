import { deleteResourcesConfirmed, type DeleteCloud } from "./resource-deletion.ts";
import { uploadResourceId } from "./upload-resource.ts";

export type DeleteQuery = (text: string, values: unknown[]) => Promise<Record<string, unknown>[]>;

export async function deleteEventData(query: DeleteQuery, deleteCloud: DeleteCloud, eventId: string) {
  // Stop new uploads and keep all references until Cloudinary confirms deletion.
  await query("UPDATE events SET deletion_pending = true, upload_open = false WHERE id = $1", [eventId]);
  const photos = await query("SELECT cloudinary_public_id FROM photos WHERE event_id = $1", [eventId]);
  const outstanding = await query("SELECT a.public_id, a.test_run_id, e.slug, e.access_mode FROM upload_authorizations a JOIN events e ON e.id = a.event_id WHERE a.event_id = $1", [eventId]);
  const ids = [...new Set([...photos.map((p) => String(p.cloudinary_public_id)),
    ...outstanding.map((a) => uploadResourceId({ slug: String(a.slug), access_mode: String(a.access_mode) },
      { public_id: String(a.public_id), test_run_id: a.test_run_id ? String(a.test_run_id) : null }))])];
  await deleteResourcesConfirmed(deleteCloud, ids);
  await query("DELETE FROM events WHERE id = $1", [eventId]);
  return ids.length;
}
