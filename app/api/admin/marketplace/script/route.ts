import { readFile } from "node:fs/promises";
import path from "node:path";
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
  try {
    const script = await readFile(path.join(process.cwd(), "scripts/marketplace/macsomenos-chat-anuncio.user.js"), "utf8");
    return new NextResponse(script, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Content-Disposition": 'attachment; filename="macsomenos-chat-anuncio-v1.4.5.user.js"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ message: "No se pudo descargar el script de respuestas" }, {
      status: 500, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
