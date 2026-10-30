import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../_admin-auth";
import { matchingPublications, publicationCatalogQuery } from "@/lib/marketplace-resolution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) {
    denied.headers.set("Cache-Control", "private, no-store");
    return denied;
  }
  const base = (process.env.API_BASE_URL || "http://127.0.0.1:3101").trim().replace(/\/+$/, "");
  try {
    const options = () => ({
      headers: { Authorization: `Bearer ${req.cookies.get("token")!.value}` },
      cache: "no-store" as const,
      signal: AbortSignal.timeout(10_000),
    });
    let response = await fetch(`${base}/admin/marketplace/resolve${req.nextUrl.search}`, options());
    const params = req.nextUrl.searchParams;
    const title = params.get("title"), price = params.get("price");
    const search = title ? publicationCatalogQuery(title) : null;
    // SKU/ID, validación, permisos, rate limiting y conflictos mantienen prioridad.
    // Solo un 404 de título/precio activa la reconstrucción del anuncio.
    if (response.status === 404 && !params.has("sku") && !params.has("productId") && title && price && search) {
      const catalogResponse = await fetch(`${base}/catalog?${new URLSearchParams({ q: search })}`, options());
      if (!catalogResponse.ok) throw new Error("Catalog lookup failed");
      const catalog = await catalogResponse.json();
      if (!Array.isArray(catalog.items)) throw new Error("Invalid catalog response");
      if (catalog.items.length > 250) return NextResponse.json({ found: false, message: "Hay demasiadas unidades de esta familia para identificar el anuncio." }, {
        status: 409, headers: { "Cache-Control": "private, no-store" },
      });
      const matches = matchingPublications(catalog.items, title, price);
      if (matches.length > 1) return NextResponse.json({ found: false, message: "Varias unidades tienen el mismo título de Marketplace y precio. No se elegirá una arbitrariamente." }, {
        status: 409, headers: { "Cache-Control": "private, no-store" },
      });
      if (matches.length === 1) {
        // Revalida publicación, propietario, slug y reservas actuales por ID.
        // Ninguna nota o dato usado para comparar se devuelve al userscript.
        response = await fetch(`${base}/admin/marketplace/resolve?${new URLSearchParams({ productId: matches[0].product_id })}`, options());
        if (response.ok) {
          const resolved = await response.json();
          if (!resolved.found || !resolved.product?.available || !["available", "preorder"].includes(resolved.product.availability)) {
            return NextResponse.json({ found: false, message: "El equipo dejó de estar disponible durante la consulta." }, {
              status: 404, headers: { "Cache-Control": "private, no-store" },
            });
          }
          return NextResponse.json({ found: true, product: {
            sku: resolved.product.sku, title: resolved.product.title, url: resolved.product.url,
            available: resolved.product.available, availability: resolved.product.availability,
          } }, { headers: { "Cache-Control": "private, no-store" } });
        }
      }
    }
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ found: false, message: "No se pudo consultar el catálogo" }, {
      status: 502, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
