import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Vista previa de una temática guardada. El navegador consulta a Next y Next al
// backend con API_BASE_URL (solo servidor): no hace falta exponer la URL del API.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ theme: null }, { status: 404 });
  try {
    const base = (process.env.API_BASE_URL || "http://127.0.0.1:3101").trim().replace(/\/+$/, "");
    const res = await fetch(`${base}/site/theme/${id}`, { cache: "no-store", signal: AbortSignal.timeout(4000) });
    if (!res.ok) return NextResponse.json({ theme: null }, { status: res.status === 404 ? 404 : 502 });
    const data = await res.json();
    return NextResponse.json({ theme: data?.theme ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ theme: null }, { status: 502 });
  }
}
