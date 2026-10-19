import { z } from "zod";
import { parseInstallationConfig } from "./installation-config.ts";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  WEDDING_CONTACT_NAME: z.string().optional(),
  WEDDING_CONTACT_PHONE: z.string().optional(),
});

export const env = { ...parseInstallationConfig(process.env), ...envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  CLOUDINARY_CLOUD_NAME:
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ??
    process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  WEDDING_CONTACT_NAME: process.env.WEDDING_CONTACT_NAME,
  WEDDING_CONTACT_PHONE: process.env.WEDDING_CONTACT_PHONE,
}) };
