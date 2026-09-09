import { EventEmitter } from "node:events";

// Emisor global en memoria. Para una sola instancia de Vercel funciona;
// si hubiera múltiples instancias, hay que mover esto a un broker (pusher, ably).
// ponytail: global lock in-memory, mover a broker si se escala a multi-instance
export const emitter = new EventEmitter();
emitter.setMaxListeners(1000);

export const PHOTO_ADDED_EVENT = "photo:added";
export const SLIDESHOW_EVENT = "slideshow:control";

export function broadcastPhotoAdded(photo: { id: string; url: string }) {
  emitter.emit(PHOTO_ADDED_EVENT, photo);
}

// Control del slideshow desde admin: pause, resume, next, prev, speed
export type SlideshowControl = {
  action: "pause" | "resume" | "next" | "prev" | "speed";
  value?: number;
};

export function broadcastSlideshow(control: SlideshowControl) {
  emitter.emit(SLIDESHOW_EVENT, control);
}
