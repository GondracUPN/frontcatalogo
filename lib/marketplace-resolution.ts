import { generateMarketplacePrice, generateMarketplaceTitle } from "./marketplace";

export function publicationTitleKey(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()
    .replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/^[\s]*remato\s+/, "").replace(/(\d)\s+(gb|tb)\b/g, "$1$2")
    .replace(/[“”″]/g, '"').replace(/(\d)\s+"/g, '$1"').replace(/\s+/g, " ").trim();
}

/** Acota la lectura JSON al modelo/familia que aparece en el anuncio. */
export function publicationCatalogQuery(title: string): string | null {
  const key = publicationTitleKey(title);
  const macbook = key.match(/\bmac\s*book(?:\s+(air|pro|neo))?\b/);
  if (macbook) return `MacBook${macbook[1] ? ` ${macbook[1]}` : ""}`;
  const iphone = key.match(/\biphone(?:\s+(\d{1,2}))?\b/);
  if (iphone) return `iPhone${iphone[1] ? ` ${iphone[1]}` : ""}`;
  const ipad = key.match(/\bipad(?:\s+(air|pro|mini))?\b/);
  if (ipad) return `iPad${ipad[1] ? ` ${ipad[1]}` : ""}`;
  if (/\b(?:apple\s*)?watch\b/.test(key)) return "Watch";
  if (/\bairpods\b/.test(key)) return "AirPods";
  if (/\bpencil\b/.test(key)) return "Pencil";
  return null;
}

export type PublicationCandidate = {
  product_id: string;
  slug: string;
  category?: string;
  availability?: string;
  product?: Record<string, any> | null;
  staged?: Record<string, any> | null;
};

/** Usa las mismas entradas y funciones que CatalogManager.prepareMarketplace. */
export function matchingPublications(rows: PublicationCandidate[], title: string, price: string) {
  const expected = publicationTitleKey(title);
  const matches = rows.filter(row => {
    if (!row.product_id || !row.slug || !["available", "preorder"].includes(row.availability || "")) return false;
    const source = row.staged || {};
    const product = {
      ...source,
      category: source.category || row.category,
      title: source.title || row.product?.title || row.slug,
      sku: source.sku || row.product?.sku || "",
      price: source.price || row.product?.price || 0,
      product_condition: source.product_condition || row.product?.product_condition,
      notes: source.notes,
    };
    // No se quitan batería, garantía, condición, RAM ni SSD del título.
    // Si el publicador no distingue dos unidades, ambas siguen siendo candidatas.
    return generateMarketplacePrice(product) === String(Number(price))
      && publicationTitleKey(generateMarketplaceTitle(product)) === expected;
  });
  return [...new Map(matches.map(row => [row.product_id, row])).values()];
}
