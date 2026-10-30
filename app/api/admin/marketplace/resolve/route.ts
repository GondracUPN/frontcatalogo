import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../_admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) {
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }
  const base = (process.env.API_BASE_URL || "http://127.0.0.1:3101").trim().replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/admin/marketplace/resolve${req.nextUrl.search}`, {
      headers: { Authorization: `Bearer ${req.cookies.get("token")!.value}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ found: false, message: "No se pudo consultar el catálogo" }, {
      status: 502, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
