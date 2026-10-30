import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../_admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) { denied.headers.set('Cache-Control', 'private, no-store'); return denied; }
  const headers = { "Cache-Control": "private, no-store" };
  if (req.headers.get("origin") !== req.nextUrl.origin) return NextResponse.json({ message: "Origen no permitido" }, { status: 403, headers });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ message: "Datos inválidos" }, { status: 400, headers }); }
  const base = (process.env.API_BASE_URL || "http://127.0.0.1:3101").trim().replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/admin/marketplace/listings`, {
      method: "POST", headers: { Authorization: `Bearer ${req.cookies.get("token")!.value}`, "Content-Type": "application/json" },
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10_000),
    });
    return NextResponse.json(await response.json(), { status: response.status, headers });
  } catch { return NextResponse.json({ message: "No se pudo guardar la asociación del anuncio" }, { status: 502, headers }); }
}
