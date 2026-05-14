import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ALLOWED_IMAGE_MIME, EXT_BY_MIME, applyWatermark, privateOriginalsDir } from "../_image-protection";
import { requireAdmin } from "../_admin-auth";

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

    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
    const originalsDir = privateOriginalsDir("uploads");
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.mkdir(originalsDir, { recursive: true });
    const arrayBuffer = await file.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const ext = EXT_BY_MIME[file.type] || path.extname(file.name) || ".bin";
    const name = `${crypto.randomUUID()}${ext}`;
    const originalDest = path.join(originalsDir, name);
    await fs.writeFile(originalDest, buf);

    const wmName = `wm-${name}`;
    const wmDest = path.join(uploadDir, wmName);
    await applyWatermark(buf, wmDest, { scale: 0.98, opacity: 0.18, logo: "product" });
    const url = `/uploads/${wmName}`;
    return NextResponse.json({ ok: true, url, watermarkedUrl: url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo subir la imagen";
    console.error("[upload] failed", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
