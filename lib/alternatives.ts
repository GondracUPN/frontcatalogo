// Alternativas de la ficha con reglas simples (sin motor de recomendación).
// Cada alternativa lleva su motivo y solo se muestran equipos disponibles.
import { catalogFacts, formatRam } from "@/lib/catalog-display";
import { catalogPrice, withIgv } from "@/lib/catalog-price";
import { formatStorageDisplay } from "@/lib/storage";

export type Alternative = {
  slug: string;
  title: string;
  image: string;
  price: number;
  condition: string;
  specs: string;
  reason: string;
};

function sizeGb(value: unknown) {
  const text = String(value || "").toUpperCase();
  const n = Number(text.match(/\d+(?:\.\d+)?/)?.[0] || 0);
  return /TB/.test(text) ? n * 1024 : n;
}

function conditionOf(row: any) {
  const notes = catalogFacts(row).notes || {};
  return String(row?.product?.product_condition || row?.staged?.product_condition || notes?.productCondition || notes?.estado || "").trim();
}

// La disponibilidad la decide el backend (vendido, reservado, preventa); el
// cálculo local queda solo para respuestas antiguas sin ese campo.
function available(row: any) {
  if (row?.availability) return row.availability === "available";
  if (row?.product?.status === "sold" || row?.staged?.status === "sold") return false;
  return Number(row?.product?.stock ?? row?.staged?.stock ?? 0) > 0;
}

function modelKey(title: string) {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

export function pickAlternatives(current: any, rows: any[], excludeSlugs: string[], limit = 4): Alternative[] {
  const exclude = new Set([String(current?.slug || ""), ...excludeSlugs.map(String)]);
  const base = catalogFacts(current);
  const basePrice = catalogPrice(current).price;
  const baseRam = sizeGb(base.ram);
  const baseStorage = sizeGb(base.storage);
  const baseCondition = conditionOf(current);
  const baseModel = modelKey(base.title);

  const pool = rows
    .filter((row) => row?.slug && !exclude.has(String(row.slug)) && available(row))
    .map((row) => {
      const facts = catalogFacts(row);
      return { row, facts, price: catalogPrice(row).price, ram: sizeGb(facts.ram), storage: sizeGb(facts.storage), condition: conditionOf(row) };
    })
    .filter((entry) => entry.price > 0);

  const chosen: Alternative[] = [];
  const used = new Set<string>();
  const take = (entry: (typeof pool)[number] | undefined, reason: string) => {
    if (!entry || used.has(String(entry.row.slug)) || chosen.length >= limit) return;
    used.add(String(entry.row.slug));
    chosen.push({
      slug: String(entry.row.slug),
      title: entry.facts.title,
      image: String(entry.row?.images?.[0] || entry.row?.staged?.images?.[0] || "/placeholder.svg"),
      price: entry.price,
      condition: entry.condition,
      specs: [entry.facts.processor, entry.facts.ram && `${formatRam(entry.facts.ram)} RAM`, entry.facts.storage && formatStorageDisplay(entry.facts.storage), entry.row?.product?.color || entry.row?.staged?.color].filter(Boolean).join(" · "),
      reason,
    });
  };
  const cheapest = (list: typeof pool) => [...list].sort((a, b) => a.price - b.price)[0];

  if (baseCondition) {
    const sameModel = cheapest(pool.filter((e) => modelKey(e.facts.title) === baseModel && e.condition && e.condition !== baseCondition));
    if (sameModel) take(sameModel, `Mismo modelo en condición ${sameModel.condition}`);
  }
  if (basePrice > 0) {
    // La alternativa más barata más cercana en precio, no la más barata de todas.
    const cheaper = pool.filter((e) => e.price < basePrice).sort((a, b) => b.price - a.price)[0];
    if (cheaper) take(cheaper, `S/ ${Math.round(withIgv(basePrice - cheaper.price)).toLocaleString("es-PE")} menos (con IGV)`);
  }
  // «Más RAM» o «más almacenamiento» solo si el precio es cercano (hasta +35 %);
  // un equipo que cuesta el triple no es una alternativa razonable.
  const nearPrice = (e: (typeof pool)[number]) => basePrice <= 0 || e.price <= basePrice * 1.35;
  if (baseRam > 0) take(cheapest(pool.filter((e) => e.ram > baseRam && nearPrice(e))), "Más memoria RAM");
  if (baseStorage > 0) take(cheapest(pool.filter((e) => e.storage > baseStorage && nearPrice(e))), "Más almacenamiento");
  return chosen;
}
