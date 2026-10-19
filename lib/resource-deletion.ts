export type DeleteCloud = (ids: string[]) => Promise<{ deleted?: Record<string, string> }>;

export async function deleteResourcesConfirmed(deleteCloud: DeleteCloud, ids: string[]) {
  const unique = [...new Set(ids)];
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    const result = await deleteCloud(batch);
    if (!batch.every((id) => ["deleted", "not_found"].includes(result.deleted?.[id] ?? ""))) {
      throw new Error("Cloudinary no confirmó todos los borrados; se conservan las referencias para reintentar");
    }
  }
}
