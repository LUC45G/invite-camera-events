type PhotoPage<T> = { photos: T[]; stats?: { status: string; n: number | string }[]; nextOffset?: number | null; error?: string };

export async function fetchPhotoPages<T extends { id: string }>(url: string) {
  const photos = new Map<string, T>();
  let offset = 0;
  let page: PhotoPage<T>;
  do {
    const response = await fetch(`${url}&offset=${offset}`);
    page = await response.json();
    if (!response.ok) throw new Error(page.error ?? "No se pudieron cargar las fotos");
    for (const photo of page.photos) photos.set(photo.id, photo);
    if (page.nextOffset == null) break;
    if (!Number.isSafeInteger(page.nextOffset) || page.nextOffset <= offset) throw new Error("Página de fotos inválida");
    offset = page.nextOffset;
  } while (true);
  return { photos: [...photos.values()], stats: page.stats ?? [] };
}
