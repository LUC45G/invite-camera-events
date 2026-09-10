import { EventEmitter } from "node:events";

// Emisor global en memoria. Para una sola instancia de Vercel funciona;
// si hubiera múltiples instancias, hay que mover esto a un broker (pusher, ably).
// ponytail: global lock in-memory, mover a broker si se escala a multi-instance
export const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export const PHOTO_ADDED_EVENT = "photo:added";
export const PHOTOS_CHANGED_EVENT = "photos:changed";
export const SLIDESHOW_EVENT = "slideshow:control";

export function broadcastPhotoAdded(photo: { id: string; url: string }) {
  emitter.emit(PHOTO_ADDED_EVENT, photo);
}

// Cambio en el set de fotos visibles (approve/reject/delete): el live
// debe refrescar la lista completa, no solo agregar al final.
export function broadcastPhotosChanged(change: {
  id: string;
  status?: string;
  deleted?: boolean;
}) {
  emitter.emit(PHOTOS_CHANGED_EVENT, change);
}

// Control del slideshow desde admin: pause, resume, next, prev, speed, projection
export type SlideshowControl = {
  action: "pause" | "resume" | "next" | "prev" | "speed" | "projection";
  value?: number;
  enabled?: boolean;
};

export function broadcastSlideshow(control: SlideshowControl) {
  emitter.emit(SLIDESHOW_EVENT, control);
}
