import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

type DeleteBody = {
  url?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DeleteBody;
    const url = String(body?.url || "");
    if (!url.startsWith("/clientes/")) {
      return NextResponse.json({ ok: false, message: "Invalid url" }, { status: 400 });
    }

    const name = path.basename(url);
    if (!name || name.toLowerCase() === "logo.png") {
      return NextResponse.json({ ok: false, message: "Invalid file" }, { status: 400 });
    }
    if (!/\.(png|jpe?g|webp|gif|avif)$/i.test(name)) {
      return NextResponse.json({ ok: false, message: "Invalid extension" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "public", "clientes");
    const dest = path.join(dir, name);
    await fs.unlink(dest);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, message: "Delete failed" }, { status: 500 });
  }
}
