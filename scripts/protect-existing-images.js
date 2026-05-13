const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const root = process.cwd();
const publicDir = path.join(root, "public");
const uploadsDir = path.join(publicDir, "uploads");
const clientsDir = path.join(publicDir, "clientes");
const uploadOriginalsPublic = path.join(uploadsDir, "originals");
const uploadOriginalsPrivate = process.env.ORIGINAL_UPLOAD_DIR || path.join(root, "storage", "uploads", "originals");
const clientOriginalsPrivate = process.env.CLIENT_ORIGINAL_UPLOAD_DIR || path.join(root, "storage", "clientes", "originals");

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLogo(preference = "client") {
  const candidates = preference === "product"
    ? [
        path.join(publicDir, "logo.png"),
        path.join(publicDir, "clientes-logo.png"),
        path.join(publicDir, "clientes", "Logo.png"),
      ]
    : [
        path.join(publicDir, "clientes-logo.png"),
        path.join(publicDir, "clientes", "Logo.png"),
        path.join(publicDir, "logo.png"),
      ];
  for (const candidate of candidates) {
    if (await exists(candidate)) return candidate;
  }
  throw new Error("No watermark logo found");
}

async function withOpacity(buffer, value) {
  const meta = await sharp(buffer).metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let maxAlpha = 0;
  for (let i = 3; i < data.length; i += channels) {
    if (data[i] > maxAlpha) maxAlpha = data[i];
  }
  const targetMax = Math.max(0, Math.min(255, Math.round(255 * value)));
  if (maxAlpha > 0) {
    for (let i = 3; i < data.length; i += channels) {
      data[i] = Math.min(255, Math.round((data[i] / maxAlpha) * targetMax));
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

async function watermark(inputBuffer, outputPath, scale, opacity, logoPreference = "client") {
  const source = sharp(inputBuffer, { failOn: "none" }).rotate();
  const meta = await source.metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  const watermarkWidth = Math.max(1, Math.round(width * scale));
  const watermarkHeight = Math.max(1, Math.round(height * scale));
  const logoBase = await sharp(await resolveLogo(logoPreference))
    .resize({ width: watermarkWidth, height: watermarkHeight, fit: "inside" })
    .ensureAlpha()
    .png()
    .toBuffer();
  const logo = await withOpacity(logoBase, opacity);
  const output = await source.composite([{ input: logo, gravity: "center", blend: "over" }]).toBuffer();
  await fs.writeFile(outputPath, output);
}

async function movePublicOriginals() {
  await fs.mkdir(uploadOriginalsPrivate, { recursive: true });
  if (!(await exists(uploadOriginalsPublic))) return 0;
  const entries = await fs.readdir(uploadOriginalsPublic, { withFileTypes: true });
  let moved = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const source = path.join(uploadOriginalsPublic, entry.name);
    const dest = path.join(uploadOriginalsPrivate, entry.name);
    if (!(await exists(dest))) await fs.copyFile(source, dest);
    await fs.unlink(source);
    moved += 1;
  }
  const remaining = await fs.readdir(uploadOriginalsPublic).catch(() => []);
  if (!remaining.length) await fs.rm(uploadOriginalsPublic, { recursive: true, force: true });
  return moved;
}

async function protectPublicImages(dir, privateDir, options) {
  await fs.mkdir(privateDir, { recursive: true });
  if (!(await exists(dir))) return 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const name = entry.name;
    if (!/\.(png|jpe?g|webp|avif)$/i.test(name)) continue;
    if (options.skipLogo && name.toLowerCase() === "logo.png") continue;
    if (options.skipWatermarked && /^wm-/i.test(name)) continue;
    const publicPath = path.join(dir, name);
    const privateCopy = path.join(privateDir, name);
    if (!(await exists(privateCopy))) await fs.copyFile(publicPath, privateCopy);
    await watermark(await fs.readFile(privateCopy), publicPath, options.scale, options.opacity, options.logo);
    count += 1;
  }
  return count;
}

async function regenerateWatermarkedUploads() {
  if (!(await exists(uploadsDir))) return 0;
  const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
  let count = 0;
  for (const entry of entries) {
    if (!entry.isFile() || !/^wm-.*\.(png|jpe?g|webp|avif)$/i.test(entry.name)) continue;
    const originalName = entry.name.replace(/^wm-/i, "");
    const originalPath = path.join(uploadOriginalsPrivate, originalName);
    if (!(await exists(originalPath))) continue;
    await watermark(
      await fs.readFile(originalPath),
      path.join(uploadsDir, entry.name),
      0.98,
      0.18,
      "product",
    );
    count += 1;
  }
  return count;
}

(async () => {
  const movedOriginals = await movePublicOriginals();
  const protectedUploads = await protectPublicImages(uploadsDir, uploadOriginalsPrivate, {
    skipWatermarked: true,
    scale: 0.98,
    opacity: 0.18,
    logo: "product",
  });
  const regeneratedWatermarkedUploads = await regenerateWatermarkedUploads();
  const protectedClients = process.env.SKIP_CLIENTS === "1"
    ? 0
    : await protectPublicImages(clientsDir, clientOriginalsPrivate, {
        skipLogo: true,
        scale: 0.94,
        opacity: 0.18,
        logo: "client",
      });
  console.log(JSON.stringify({ movedOriginals, protectedUploads, regeneratedWatermarkedUploads, protectedClients }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
