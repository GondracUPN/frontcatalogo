import { NextRequest, NextResponse } from "next/server";
import { getCatalogComparison } from "@/app/actions";

export async function GET(request: NextRequest) {
  const slugs = (request.nextUrl.searchParams.get("items") || "").split(",").map(slug => slug.trim()).filter(Boolean);
  try {
    const result = await getCatalogComparison(slugs);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "No pudimos actualizar la comparación. Inténtalo de nuevo." }, { status: 503 });
  }
}
