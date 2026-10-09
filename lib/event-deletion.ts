export type DeleteQuery = (text: string, values: unknown[]) => Promise<Record<string, unknown>[]>;
export type DeleteCloud = (ids: string[]) => Promise<{ deleted?: Record<string, string> }>;

export async function deleteEventData(query: DeleteQuery, deleteCloud: DeleteCloud, eventId: string) {
  // Stop new uploads and keep all references until Cloudinary confirms deletion.
  await query("UPDATE events SET deletion_pending = true, upload_open = false WHERE id = $1", [eventId]);
  const photos = await query("SELECT cloudinary_public_id FROM photos WHERE event_id = $1", [eventId]);
  const ids = [...new Set(photos.map((p) => String(p.cloudinary_public_id)))];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const result = await deleteCloud(batch);
    if (!batch.every((id) => result.deleted?.[id] === "deleted" || result.deleted?.[id] === "not_found")) {
      throw new Error("Cloudinary no confirmó todos los borrados. Los registros se conservan para reintentar.");
    }
  }
  await query("DELETE FROM events WHERE id = $1", [eventId]);
  return ids.length;
}
