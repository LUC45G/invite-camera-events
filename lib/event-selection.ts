export function selectInstallationEvent<T>(events: T[]): T | null {
  if (events.length > 1) {
    throw new Error("Hay varios eventos configurados. Esta instalación admite un solo evento.");
  }
  return events[0] ?? null;
}

export function installationState(event: { setup_complete?: boolean } | null) {
  if (!event) return "empty";
  return event.setup_complete === false ? "pending" : "configured";
}
