import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export async function POST(req: NextRequest) {
  const { tags } = await req.json().catch(() => ({ tags: [] }));
  const list: string[] = Array.isArray(tags) && tags.length ? tags : ["catalog-products", "catalog-staged"];
  for (const t of list) revalidateTag(t);
  return NextResponse.json({ ok: true, tags: list });
}
