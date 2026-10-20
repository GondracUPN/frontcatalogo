import { NextRequest, NextResponse } from "next/server";
import { listCatalog } from "@/app/actions";
import { catalogFacts, compactSpecs, formatRam } from "@/lib/catalog-display";
import { catalogPrice, withIgv } from "@/lib/catalog-price";
import { matchesTerms, searchTerms, searchableText } from "@/lib/catalog-search";

// Sugerencias del buscador de la cabecera. Filtra en el servidor sobre la
// lista pública ya cacheada (5 min, etiqueta catalog-products) y devuelve
// como máximo 5 equipos con los campos que se muestran: el navegador no
// descarga el inventario.
const MAX_SUGGESTIONS = 5;

function isAvailable(row: any) {
  const sold = row?.product?.status === "sold" || row?.staged?.status === "sold";
  const stock = Number(row?.product?.stock ?? row?.staged?.stock ?? 0);
  return !sold && stock > 0;
}

export async function GET(req: NextRequest) {
  const terms = searchTerms(String(req.nextUrl.searchParams.get("q") || "").slice(0, 80));
  if (!terms.length) return NextResponse.json({ items: [], total: 0 });
  try {
    const { items } = await listCatalog();
    const matches = (Array.isArray(items) ? items : []).filter((row: any) => isAvailable(row) && matchesTerms(searchableText(row), terms));
    const suggestions = matches.slice(0, MAX_SUGGESTIONS).map((row: any) => {
      const facts = catalogFacts(row);
      const { price } = catalogPrice(row);
      const condition = String(row?.product?.product_condition || row?.staged?.product_condition || facts.notes?.productCondition || "");
      return {
        slug: String(row.slug),
        title: facts.title,
        image: String(row?.images?.[0] || row?.staged?.images?.[0] || ""),
        // El color distingue dos unidades del mismo modelo y configuración.
        specs: [compactSpecs({ ...facts, ram: formatRam(facts.ram) })[0], String(row?.product?.color || row?.staged?.color || "").trim()].filter(Boolean).join(" · "),
        condition,
        priceWithIgv: +withIgv(price).toFixed(2),
      };
    });
    return NextResponse.json(
      { items: suggestions, total: matches.length },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
    );
  } catch {
    return NextResponse.json({ items: [], total: 0, unavailable: true }, { status: 503 });
  }
}
