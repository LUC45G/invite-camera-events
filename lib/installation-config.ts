import { z } from "zod";

const identitySchema = z.object({
  EVENT_SLUG: z.string().trim().max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  DEPLOYMENT_ID: z.string().trim().min(1).max(128),
  EVENT_HOSTNAME: z.string().trim().toLowerCase().max(253)
    .regex(/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
});

export function parseInstallationConfig(source: NodeJS.ProcessEnv) {
  const development = source.NODE_ENV !== "production";
  return identitySchema.parse({
    EVENT_SLUG: source.EVENT_SLUG ?? (development ? "nuestra-boda" : undefined),
    DEPLOYMENT_ID: source.DEPLOYMENT_ID ?? (development ? "local" : undefined),
    EVENT_HOSTNAME: source.EVENT_HOSTNAME ?? (development ? "localhost" : undefined),
  });
}
