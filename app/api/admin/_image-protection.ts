import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

export const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/avif", "image/webp"]);

export const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/avif": ".avif",
  "image/webp": ".webp",
};

export function privateOriginalsDir(scope: "uploads" | "clientes") {
  const envName = scope === "uploads" ? "ORIGINAL_UPLOAD_DIR" : "CLIENT_ORIGINAL_UPLOAD_DIR";
  return process.env[envName] || path.join(process.cwd(), "storage", scope, "originals");
}

export async function resolveWatermarkLogo(preference: "product" | "client" = "client") {
  const publicDir = path.join(process.cwd(), "public");
  const candidates =
    preference === "product"
      ? [
          path.join(publicDir, "logo.png"),
          path.join(publicDir, "clientes-logo.png"),
          path.join(publicDir, "clientes", "Logo.png"),
          path.join(publicDir, "clientes", "logo.png"),
        ]
      : [
          path.join(publicDir, "clientes-logo.png"),
          path.join(publicDir, "clientes", "Logo.png"),
          path.join(publicDir, "clientes", "logo.png"),
          path.join(publicDir, "logo.png"),
        ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  return path.join(publicDir, "logo.png");
}

async function withOpacity(input: Buffer, opacity: number) {
  const meta = await sharp(input).metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let maxAlpha = 0;
  for (let i = 3; i < data.length; i += channels) {
    if (data[i] > maxAlpha) maxAlpha = data[i];
  }
  const targetMax = Math.max(0, Math.min(255, Math.round(255 * opacity)));
  if (maxAlpha > 0) {
    for (let i = 3; i < data.length; i += channels) {
      data[i] = Math.min(255, Math.round((data[i] / maxAlpha) * targetMax));
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

export async function watermarkBuffer(
  input: Buffer,
  options: { scale?: number; opacity?: number; logo?: "product" | "client" } = {}
) {
  const scale = options.scale ?? 0.72;
  const opacity = options.opacity ?? 0.5;
  const source = sharp(input, { failOn: "none" }).rotate();
  const meta = await source.metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  const watermarkWidth = Math.max(1, Math.round(width * scale));
  const watermarkHeight = Math.max(1, Math.round(height * scale));
  const logoPath = await resolveWatermarkLogo(options.logo);
  const logoBase = await sharp(logoPath)
    .resize({ width: watermarkWidth, height: watermarkHeight, fit: "inside", kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .png()
    .toBuffer();
  const logo = await withOpacity(logoBase, opacity);

  return source
    .composite([{ input: logo, gravity: "center", blend: "over" }])
    .toBuffer();
}

export async function applyWatermark(
  input: Buffer,
  outputPath: string,
  options: { scale?: number; opacity?: number; logo?: "product" | "client" } = {}
) {
  const out = await watermarkBuffer(input, options);
  await fs.writeFile(outputPath, out);
}
