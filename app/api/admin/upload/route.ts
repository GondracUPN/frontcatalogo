import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

export const dynamic = "force-dynamic";

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/avif"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/avif": ".avif",
};

async function resolveWatermarkLogo() {
  const base = path.join(process.cwd(), "public", "clientes");
  const candidates = ["logo.png", "Logo.png", "LOGO.png"];
  for (const name of candidates) {
    const p = path.join(base, name);
    try {
      await fs.access(p);
      return p;
    } catch {}
  }
  return path.join(base, "logo.png");
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "No file" }, { status: 400 });
  if (file.type && !ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ ok: false, message: "Tipo de imagen no permitido" }, { status: 415 });
  }

  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  const originalsDir = path.join(uploadDir, "originals");
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.mkdir(originalsDir, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const ext = path.extname(file.name) || EXT_BY_MIME[file.type] || ".bin";
  const name = `${crypto.randomUUID()}${ext}`;
  const originalDest = path.join(originalsDir, name);
  await fs.writeFile(originalDest, buf);

  const wmName = `wm-${name}`;
  const wmDest = path.join(uploadDir, wmName);
  const logoPath = await resolveWatermarkLogo();
  try {
    const base = sharp(buf);
    const meta = await base.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    const minDim = Math.max(1, Math.min(width || 1, height || 1));
    const watermarkWidth = Math.max(1, Math.round(minDim * 0.7));
    const logo = await sharp(logoPath)
      .resize({ width: watermarkWidth, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
      .ensureAlpha(0.05)
      .toBuffer();
    const out = await sharp(buf)
      .composite([{ input: logo, gravity: "center", blend: "over" }])
      .toBuffer();
    await fs.writeFile(wmDest, out);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Watermark failed";
    // eslint-disable-next-line no-console
    console.error("[upload] watermark failed", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
  const url = `/uploads/${wmName}`;
  return NextResponse.json({ ok: true, url, originalUrl: `/uploads/originals/${name}`, watermarkedUrl: url });
}
