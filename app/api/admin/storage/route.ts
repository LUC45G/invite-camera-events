import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";
import { cloudinary } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";

type Metric = { usage: number | null; limit: number | null };

type CloudinaryUsage = {
  plan?: unknown;
  objects?: unknown;
  resources?: unknown;
  storage?: unknown;
  bandwidth?: unknown;
  requests?: unknown;
  transformations?: unknown;
};

function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metric(value: unknown): Metric {
  if (typeof value !== "object" || value === null) {
    return { usage: null, limit: null };
  }
  const record = value as Record<string, unknown>;
  return { usage: toNumber(record.usage), limit: toNumber(record.limit) };
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return unauthorized();

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") ?? "nuestra-boda";

  let cloud: CloudinaryUsage | null = null;
  let cloudError: string | null = null;
  try {
    cloud = (await cloudinary.api.usage()) as CloudinaryUsage;
  } catch (error) {
    cloudError =
      error instanceof Error ? error.message : "Cloudinary no disponible";
  }

  const stats = (await sql`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE status = 'approved') AS approved,
      count(*) FILTER (WHERE status = 'pending') AS pending,
      count(*) FILTER (WHERE status = 'rejected') AS rejected,
      COALESCE(SUM(size_kb), 0) AS total_kb,
      MAX(created_at) AS last_upload
    FROM photos p
    JOIN events e ON e.id = p.event_id
    WHERE e.slug = ${slug}
  `) as {
    total: string | number;
    approved: string | number;
    pending: string | number;
    rejected: string | number;
    total_kb: string | number;
    last_upload: string | null;
  }[];

  const db = {
    total: Number(stats[0]?.total ?? 0),
    approved: Number(stats[0]?.approved ?? 0),
    pending: Number(stats[0]?.pending ?? 0),
    rejected: Number(stats[0]?.rejected ?? 0),
    totalKb: Number(stats[0]?.total_kb ?? 0),
    lastUpload: stats[0]?.last_upload ?? null,
  };

  return NextResponse.json({
    cloud: cloud
      ? {
          objects: metric(cloud.objects ?? cloud.resources),
          storage: metric(cloud.storage),
          bandwidth: metric(cloud.bandwidth),
          requests: metric(cloud.requests),
          transformations: metric(cloud.transformations),
        }
      : null,
    cloudError,
    db,
  });
}
