import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const fileName = "macsomenos-market-p.user.js";
  const scriptPath = path.resolve(process.cwd(), "public", fileName);

  try {
    const script = await readFile(scriptPath, "utf8");

    return new NextResponse(script, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("No se pudo leer el script de Tampermonkey", error);
    return NextResponse.json(
      { ok: false, message: "No se pudo descargar el script de Tampermonkey" },
      { status: 500 },
    );
  }
}
