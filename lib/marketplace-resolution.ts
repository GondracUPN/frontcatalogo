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
  if (/\bmac\s*mini\b/.test(key)) return "Mac mini";
  if (/\bimac\b/.test(key)) return "iMac";
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
function generatedPublication(row: PublicationCandidate) {
    if (!row.product_id || !row.slug || !["available", "preorder"].includes(row.availability || "")) return null;
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
    const titles = [publicationTitleKey(generateMarketplaceTitle(product))];
    const notes = typeof source.notes === 'string' ? (() => { try { return JSON.parse(source.notes); } catch { return {}; } })() : source.notes || {};
    const detail = notes.specs?.detalle || notes.detalle || {};
    const previousTitle = detail.descripcionOtro || notes.descripcionOtro;
    const desktopFamily = (value: string) => /\bmac\s*mini\b/i.test(value) ? 'mini' : /\bimac\b/i.test(value) ? 'imac' : null;
    const chip = (value: string) => value.toLowerCase().match(/\b[ma]\d+(?:\s+(?:pro|max|ultra))?\b/)?.[0];
    // Conserva los títulos históricos guardados al normalizar Mac mini/iMac.
    // Un alias M4 no puede vincularse a un M4 Pro ni a otra familia.
    if (typeof previousTitle === 'string' && previousTitle.length <= 300
      && desktopFamily(product.title) && desktopFamily(product.title) === desktopFamily(previousTitle)
      && chip(previousTitle) && chip(previousTitle) === chip(String(detail.procesador || product.title))) {
      titles.push(publicationTitleKey(generateMarketplaceTitle({ ...product, title: previousTitle })));
    }
    return { row, price: generateMarketplacePrice(product), titles };
}

export function matchingPublications(rows: PublicationCandidate[], title: string, price: string) {
  const expected = publicationTitleKey(title);
  const matches = rows.filter(row => {
    const generated = generatedPublication(row);
    return generated?.price === String(Number(price)) && generated.titles.includes(expected);
  });
  return [...new Map(matches.map(row => [row.product_id, row])).values()];
}

/** Solo resume datos públicos; nunca incluye notas o datos del comprador. */
export function publicationMismatch(rows: PublicationCandidate[], title: string, price: string) {
  const expected = publicationTitleKey(title);
  const generated = rows.map(generatedPublication).filter(item => item !== null);
  const pricesForTitle = [...new Set(generated.filter(item => item.titles.includes(expected)).map(item => item.price))];
  if (pricesForTitle.length) return {
    code: "PRICE_MISMATCH", message: `El título coincide, pero el precio de Facebook (S/ ${price}) difiere del precio actual de publicación (S/ ${pricesForTitle.join(" o S/ ")}). No se enviará el enlace con datos distintos.`,
  };
  if (generated.some(item => item.price === String(Number(price)))) return {
    code: "TITLE_MISMATCH", message: "Hay equipos de ese precio, pero sus títulos y especificaciones no coinciden con el anuncio. No se enviará otro equipo.",
  };
  return { code: "NO_VERIFIABLE_MATCH", message: "No hay una unidad publicada y disponible que coincida con el título y precio leídos de este anuncio." };
}
