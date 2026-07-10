import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_admin-auth";
import { readProductVersionConfig, writeProductVersionConfig } from "@/lib/product-version-config.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const config = await readProductVersionConfig();
  return NextResponse.json({ ok: true, config });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    const config = await writeProductVersionConfig(body?.config || {});
    return NextResponse.json({ ok: true, config });
  } catch {
    return NextResponse.json({ ok: false, message: "No se pudo guardar la configuración" }, { status: 400 });
  }
}
