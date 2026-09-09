import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

// Lista de mesas con sus tokens (solo admin). El cliente arma las URLs
// con su propio origin para que funcione en cualquier entorno.
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const rows = (await sql`
    SELECT t.table_number, t.qr_token
    FROM table_qrs t
    ORDER BY t.table_number ASC
  `) as { table_number: number; qr_token: string }[];

  return NextResponse.json({ tables: rows });
}
