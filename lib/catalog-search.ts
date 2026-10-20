// Búsqueda del catálogo sin servicios externos: el inventario es pequeño, así
// que basta con comparar texto normalizado. La usan el catálogo (en el
// navegador) y las sugerencias del buscador (en el servidor).
import { catalogFacts, formatRam } from "@/lib/catalog-display";
import { formatStorageCompact } from "@/lib/storage";

// Equivalencias conservadoras entre español e inglés. No se une «Midnight» con
// «negro» porque no es el mismo color.
const COLOR_SYNONYMS: Array<string[]> = [
  ["negro", "black"],
  ["blanco", "white"],
  ["plata", "plateado", "silver"],
  ["gris", "gray", "grey"],
  ["dorado", "oro", "gold"],
  ["azul", "blue"],
  ["rosado", "rosa", "pink"],
  ["verde", "green"],
  ["morado", "purple"],
  ["rojo", "red"],
  ["amarillo", "yellow"],
  ["naranja", "orange"],
];

const WORD_FIXES: Array<[RegExp, string]> = [
  [/\bmac\s+book\b/g, "macbook"],
  [/\bi\s+phone\b/g, "iphone"],
  [/\bi\s+pad\b/g, "ipad"],
  [/\bapple\s+watch\b/g, "watch"],
  [/\breloj\b/g, "watch"],
  [/\bpulgadas?\b/g, ""],
  [/\bseries\b/g, "serie"],
];

export function normalizeSearchText(value: unknown) {
  let text = String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}+/gu, "")
    .toLowerCase()
    .replace(/["”'’]/g, " ");
  for (const [pattern, replacement] of WORD_FIXES) text = text.replace(pattern, replacement);
  return text
    // «MS-255», «ms 255» o «SKU 255» → «ms255», para no confundir un SKU con «256GB».
    .replace(/\b(?:ms|sku)[\s\-_:#]*(\d+)\b/g, "ms$1")
    .replace(/(\d)\s+(gb|tb)\b/g, "$1$2")
    .replace(/[/+,;|()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function colorVariants(term: string) {
  const group = COLOR_SYNONYMS.find((words) => words.includes(term));
  return group || [term];
}

/** «16/512» → «16gb», «512gb». Se usa cuando el término es solo un número. */
function numericVariants(term: string) {
  if (!/^\d{1,4}$/.test(term)) return [term];
  const n = Number(term);
  const variants = [term, `${n}gb`];
  if (n === 1 || n === 2 || n === 4) variants.push(`${n}tb`);
  return variants;
}

/** Texto completo en el que se busca: título, chip, RAM, SSD, color, condición… */
export function searchableText(row: any) {
  const facts = catalogFacts(row);
  const product = row?.product || {};
  const staged = row?.staged || {};
  const notes = facts.notes || {};
  const ram = formatRam(facts.ram).replace(/\s+/g, "");
  const storage = formatStorageCompact(facts.storage);
  const color = String(product.color || staged.color || notes?.color || "");
  const condition = String(product.product_condition || staged.product_condition || notes?.productCondition || notes?.estado || "");
  const iphone = [product.iphone_number ?? staged.iphone_number ?? notes?.iphoneNumber, product.iphone_model || staged.iphone_model || notes?.iphoneModel]
    .filter(Boolean).join(" ");
  const detail = facts.detail || {};
  const size = String(detail["tamaño"] || detail.tamano || detail.tamanio || notes?.watchSize || "");
  return normalizeSearchText([
    facts.title,
    facts.category,
    facts.processor,
    ram,
    storage,
    color,
    condition,
    iphone,
    detail.gama,
    detail.conectividad,
    size,
    // El SKU numérico se indexa con prefijo («ms255») para que «512» o «15»
    // no encuentren unidades por su SKU. El slug no se indexa: sus sufijos
    // («-11») chocaban con modelos como «Air 11».
    /^\d+$/.test(facts.sku) ? `ms${facts.sku}` : facts.sku,
  ].join(" "));
}

export function searchTerms(query: string) {
  return normalizeSearchText(query).split(" ").filter(Boolean);
}

/** Todos los términos deben aparecer; cada término acepta sus equivalencias. */
export function matchesTerms(text: string, terms: string[]) {
  const words = text.split(" ");
  return terms.every((term) => {
    const options = numericVariants(term).flatMap(colorVariants);
    // Números y capacidades deben coincidir con una palabra completa: «16» no
    // debe encontrar «160GB». El resto admite prefijos mientras se escribe.
    return options.some((option) => (/^\d+(gb|tb)?$/.test(option) ? words.includes(option) : text.includes(option)));
  });
}

/** Cuántos términos coinciden. Sirve para ofrecer resultados parecidos. */
export function matchScore(text: string, terms: string[]) {
  return terms.filter((term) => matchesTerms(text, [term])).length;
}
