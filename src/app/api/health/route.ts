import { NextResponse } from "next/server";

import { getAppUrl } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "familyflow-ai",
    url: getAppUrl(),
    databaseProvider: "postgresql",
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    timestamp: new Date().toISOString(),
  });
}
