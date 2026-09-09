import { neon } from "@neondatabase/serverless";
import { env } from "@/lib/env";

export const sql = neon(env.DATABASE_URL);

export type Event = {
  id: string;
  name: string;
  slug: string;
  reveal_at: string | null;
  upload_open: boolean;
  max_photos_per_session: number;
  projection_enabled: boolean;
  slideshow_interval: number;
};

export type Guest = {
  id: string;
  event_id: string;
  table_qr_id: string | null;
  token: string;
  name: string | null;
  rsvp_status: "pending" | "accepted" | "declined";
  rsvp_guests: number;
  rsvp_dietary: string | null;
  rsvp_responded_at: string | null;
};

export type TableQr = {
  id: string;
  event_id: string;
  table_number: number;
  qr_token: string;
};

export type UploadSession = {
  id: string;
  event_id: string;
  table_qr_id: string;
  photo_count: number;
  first_seen_at: string;
  last_seen_at: string;
};

export type Photo = {
  id: string;
  event_id: string;
  table_qr_id: string | null;
  upload_session_id: string | null;
  cloudinary_public_id: string;
  cloudinary_url: string;
  thumbnail_url: string;
  original_width: number | null;
  original_height: number | null;
  mime_type: string | null;
  size_kb: number | null;
  status: "pending" | "approved" | "rejected";
  nsfw_score: number | null;
  created_at: string;
};
