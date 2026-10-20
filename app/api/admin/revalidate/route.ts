import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

const ALLOWED_TAGS = new Set(["catalog-products", "catalog-staged"]);

function validSecret(req: NextRequest) {
  const expected = String(process.env.REVALIDATE_SECRET || "").trim();
  if (!expected) return false;
  const provided = String(req.headers.get("x-revalidate-secret") || "").trim();
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!String(process.env.REVALIDATE_SECRET || '').trim()) {
    return NextResponse.json({ ok: false, message: "Revalidation authentication is not configured" }, { status: 503 });
  }
  if (!validSecret(req)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }
  const { tags } = await req.json().catch(() => ({ tags: [] }));
  const requested: string[] = Array.isArray(tags) && tags.length ? tags.map(String) : ["catalog-products", "catalog-staged"];
  const list = requested.filter((tag) => ALLOWED_TAGS.has(tag));
  for (const t of list) revalidateTag(t);
  return NextResponse.json({ ok: true, tags: list });
}
