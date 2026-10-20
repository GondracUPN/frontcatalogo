import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const base = (process.env.API_BASE_URL || "http://127.0.0.1:3101").trim().replace(/\/+$/, "");
    const response = await fetch(`${base}/catalog/client-purchases`, { cache: "no-store" });
    if (!response.ok) throw new Error(`API ${response.status}`);
    const data = await response.json();
    return NextResponse.json({ ok: true, items: Array.isArray(data.items) ? data.items : [] });
  } catch {
    return NextResponse.json({ ok: false, items: [] }, { status: 502 });
  }
}
