import { NextResponse } from "next/server";

import { getAppUrl, resolveDatabasePath } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "familyflow-ai",
    url: getAppUrl(),
    databasePath: resolveDatabasePath(),
    timestamp: new Date().toISOString(),
  });
}
