import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { privateOriginalsDir } from "../../_image-protection";
import { requireAdmin } from "../../_admin-auth";

export const dynamic = "force-dynamic";

type DeleteBody = {
  url?: string;
};

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

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
    await fs.unlink(dest).catch((err: unknown) => {
      if ((err as { code?: string })?.code !== "ENOENT") throw err;
    });
    await fs.unlink(path.join(privateOriginalsDir("clientes"), name)).catch((err: unknown) => {
      if ((err as { code?: string })?.code !== "ENOENT") throw err;
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === "ENOENT") return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, message: "Delete failed" }, { status: 500 });
  }
}
