import { neon } from "@neondatabase/serverless";
import { env } from "@/lib/env";

export const sql = neon(env.DATABASE_URL);

export type Event = {
  id: string;
  name: string;
  slug: string;
  reveal_at: string | null;
  max_photos_per_session: number;
  projection_enabled: boolean;
  slideshow_interval: number;
};

export type Guest = {
  id: string;
  event_id: string;
  token: string;
  name: string | null;
  rsvp_status: "pending" | "accepted" | "declined";
  rsvp_guests: number;
  rsvp_responded_at: string | null;
};

export type TableQr = {
  id: string;
  event_id: string;
  table_number: number;
  qr_token: string;
};

export type Photo = {
  id: string;
  event_id: string;
  table_qr_id: string | null;
  cloudinary_public_id: string;
  cloudinary_url: string;
  thumbnail_url: string;
  status: "pending" | "approved" | "rejected";
  nsfw_score: number | null;
};
