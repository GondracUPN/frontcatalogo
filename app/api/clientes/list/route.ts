import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { isCloudinaryConfigured, listCloudinaryImages } from "@/lib/cloudinary";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    if (isCloudinaryConfigured()) {
      const urls = await listCloudinaryImages("clients", 24);
      return NextResponse.json({ ok: true, urls });
    }

    const dir = path.join(process.cwd(), "public", "clientes");
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(png|jpe?g|webp|gif|avif)$/i.test(name))
      .filter((name) => name.toLowerCase() !== "logo.png");
    const withTimes = await Promise.all(
      files.map(async (name) => {
        const stat = await fs.stat(path.join(dir, name));
        return { name, mtime: stat.mtimeMs };
      })
    );
    const urls = withTimes
      .sort((a, b) => b.mtime - a.mtime)
      .map((file) => `/clientes/${file.name}`);
    return NextResponse.json({ ok: true, urls });
  } catch {
    return NextResponse.json({ ok: true, urls: [] });
  }
}
