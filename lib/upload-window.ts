import type { Event } from "@/lib/db";

export type UploadWindowStatus = "before" | "available" | "paused" | "finished";
export type UploadWindowState = {
  status: UploadWindowStatus;
  startsAt: string | null;
  endsAt: string | null;
  canStartNewUpload: boolean;
  canTogglePause: boolean;
  canEditSetup: boolean;
  label: string;
  message: string;
};

type UploadWindowEvent = Pick<Event, "upload_starts_at" | "upload_ends_at" | "upload_open">;

export function getUploadWindowState(event: UploadWindowEvent, now = new Date()): UploadWindowState {
  const startsAt = event.upload_starts_at;
  const endsAt = event.upload_ends_at;
  const start = startsAt ? new Date(startsAt) : null;
  const end = endsAt ? new Date(endsAt) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || now < start) {
    return { status: "before", startsAt, endsAt, canStartNewUpload: false, canTogglePause: false, canEditSetup: true, label: "Antes de la apertura", message: "La carga se habilita al mediodía del día del evento." };
  }
  if (now >= end) {
    return { status: "finished", startsAt, endsAt, canStartNewUpload: false, canTogglePause: false, canEditSetup: false, label: "Finalizada", message: "La ventana de carga finalizó." };
  }
  if (!event.upload_open) {
    return { status: "paused", startsAt, endsAt, canStartNewUpload: false, canTogglePause: true, canEditSetup: false, label: "Pausada", message: "La carga está pausada por el organizador." };
  }
  return { status: "available", startsAt, endsAt, canStartNewUpload: true, canTogglePause: true, canEditSetup: false, label: "Disponible", message: "La carga está disponible." };
}

export function uploadWindowError(state: UploadWindowState) {
  return { error: state.message, uploadWindow: state };
}
