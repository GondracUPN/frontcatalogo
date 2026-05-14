import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ALLOWED_IMAGE_MIME, EXT_BY_MIME, applyWatermark, privateOriginalsDir } from "../../_image-protection";
import { requireAdmin } from "../../_admin-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authError = await requireAdmin(req);
    if (authError) return authError;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "No file" }, { status: 400 });
    if (file.type && !ALLOWED_IMAGE_MIME.has(file.type)) {
      return NextResponse.json({ ok: false, message: "Tipo de imagen no permitido" }, { status: 415 });
    }

    const uploadDir = path.join(process.cwd(), "public", "clientes");
    const originalsDir = privateOriginalsDir("clientes");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(originalsDir, { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const ext = EXT_BY_MIME[file.type] || path.extname(file.name) || ".bin";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    await fs.writeFile(path.join(originalsDir, name), buf);
    const dest = path.join(uploadDir, name);
    await applyWatermark(buf, dest, { scale: 0.94, opacity: 0.18, logo: "client" });
    const url = `/clientes/${name}`;
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo subir la imagen";
    console.error("[clientes/upload] failed", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
