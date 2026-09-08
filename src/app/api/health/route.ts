import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    app: "ok",
    database: process.env.DATABASE_URL ? "configured" : "not_configured",
    datajud: process.env.DATAJUD_API_KEY ? "configured" : "not_configured",
    djen: process.env.DJEN_BASE_URL ? "configured" : "not_configured",
    scheduler: "not_configured",
    checkedAt: new Date().toISOString(),
  });
}
