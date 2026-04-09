import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ ok: false, message: "No file" }, { status: 400 });

  const uploadDir = path.join(process.cwd(), "public", "clientes");
  await fs.mkdir(uploadDir, { recursive: true });
  const arrayBuffer = await file.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  const ext = path.extname(file.name) || ".bin";
  const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dest = path.join(uploadDir, name);
  await fs.writeFile(dest, buf);
  const url = `/clientes/${name}`;
  return NextResponse.json({ ok: true, url });
}
