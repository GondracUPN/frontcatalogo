import { accessoryBreakdown, catalogFacts, conditionInfo, formatRam, keyboardLabel, screenSizeLabel } from "./catalog-display";
import { catalogPrice, formatSoles, withIgv } from "./catalog-price";
import { formatWarrantyDate, warrantyStatus } from "./warranty";

export type CompareItem = Record<string, any>;
export type CompareValue = { text: string; state: "known" | "missing" | "na" };
export type ComparisonRow = { key: string; label: string; values: CompareValue[]; different: boolean; incomplete: boolean };
export type ComparisonSection = { key: string; label: string; rows: ComparisonRow[] };
const text = (value: unknown) => value == null ? "" : String(value).trim();
const first = (...values: unknown[]) => values.map(text).find(Boolean) || "";
const norm = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
const known = (value: unknown): CompareValue => text(value) ? { text: text(value), state: "known" } : { text: "No registrado", state: "missing" };
const na = (): CompareValue => ({ text: "No aplica", state: "na" });

export function comparisonProduct(item: CompareItem) {
  const facts = catalogFacts(item), p = item.product || {}, s = item.staged || {}, n = facts.notes;
  const raw = first(p.product_condition, s.product_condition, n.productCondition, n.estado, n.specs?.estado);
  const condition = /sellad/i.test(raw) ? "Nuevo" : conditionInfo(raw)?.label || raw;
  const presentationRaw = first(p.presentation, s.presentation);
  const presentation = /^sellado$/i.test(presentationRaw) || (/sellad/i.test(raw) && !presentationRaw) ? "Sellado" : /^abierto$/i.test(presentationRaw) ? "Abierto" : presentationRaw;
  let availability = text(item.availability);
  if (!availability) {
    const saleType = catalogPrice(item).saleType;
    const stock = p.stock ?? s.stock;
    availability = p.status === "sold" || s.status === "sold" ? "sold" : p.status === "reserved" || s.status === "reserved" ? "reserved" : saleType === "PREVENTA" ? "preorder" : stock == null || stock === "" ? "" : Number(stock) > 0 ? "available" : "sold";
  }
  const availabilityLabel = ({ available: "Disponible", preorder: "En camino", reserved: "Reservado", sold: "Vendido" } as Record<string, string>)[availability] || "No registrado";
  const color = first(p.color, s.color, n.color);
  const price = catalogPrice(item);
  const priceKnown = [p.price, s.price, n.precioLista].some(value => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)));
  return { ...facts, item, condition, presentation, commercialLabel: condition === "Nuevo" && presentation === "Sellado" ? "Nuevo · Sellado" : condition || "No registrado", color, availability, availabilityLabel, price, priceKnown,
    image: first(item.images?.[0], s.images?.[0], item.image, "/placeholder.svg"),
    summary: [facts.processor, formatRam(facts.ram), facts.storage, facts.category === "watch" ? [n.watchType, n.watchSeries || n.watchVersion, n.watchSize && `${n.watchSize} mm`, n.watchConnection].filter(Boolean).join(" · ") : "", color].filter(Boolean).join(" · ") };
}

export function comparisonWarranty(item: CompareItem): CompareValue {
  const n = catalogFacts(item).notes;
  const obj = [n.warranty, n.garantiaDetalle, n.garantia].find(v => v && typeof v === "object") || {};
  const flag = n.warrantyEnabled ?? n.garantiaActiva ?? obj.enabled ?? obj.activa;
  if (flag === false || flag === 0 || /^(false|0|no)$/i.test(text(flag))) return known("Sin garantía registrada");
  const type = first(n.warrantyType, n.garantiaTipo, n.tipoGarantia, obj.type, obj.tipo);
  const date = first(n.warrantyDate, n.garantiaFecha, obj.date, obj.fecha, obj.hasta, obj.detalle, typeof n.garantia === "string" ? n.garantia : "");
  if (!type && !date) return known(flag === true || /^(true|1|si|sí)$/i.test(text(flag)) ? "Con garantía · vigencia no registrada" : "");
  const status = warrantyStatus(date);
  return known([type, date && `${status === "expired" ? "Vencida: " : status === "active" ? "Hasta el " : ""}${formatWarrantyDate(date)}`].filter(Boolean).join(" · "));
}

/** Un atributo ausente no convierte una fila en una diferencia real. */
export function buildComparison(items: CompareItem[], onlyDifferences = false): ComparisonSection[] {
  const products = items.map(comparisonProduct);
  type Product = ReturnType<typeof comparisonProduct>;
  type Definition = { key: string; label: string; read: (p: Product) => CompareValue; always?: boolean };
  const field = (key: string, label: string, read: Definition["read"], always = false): Definition => ({ key, label, read, always });
  const portable = (p: Product) => ["macbook", "ipad", "iphone", "watch"].includes(p.category.toLowerCase());
  const computer = (p: Product) => ["macbook", "ipad"].includes(p.category.toLowerCase());
  const cyclesApply = (p: Product) => {
    if (p.batteryCycles !== "") return true;
    if (["macbook", "ipad"].includes(p.category)) return true;
    const number = Number(first(p.item.product?.iphone_number, p.item.staged?.iphone_number, p.notes.iphoneNumber, p.detail.numero));
    return p.category === "iphone" && (!number || number >= 15);
  };
  const accessories = (p: Product) => accessoryBreakdown({ category: p.category, includes: p.item.product?.includes ?? p.item.staged?.includes ?? p.notes.includes ?? p.notes.watchIncludes ?? p.notes.watchAccessories, includesExtra: p.item.product?.includes_extra ?? p.item.staged?.includes_extra ?? p.notes.includesExtra, legacy: p.notes.incluye, cuboGeneric: p.notes.cuboFake === true || p.notes.cuboFake === "true", cableGeneric: p.notes.cableFake === true || p.notes.cableFake === "true" });
  const groups: Array<{ key: string; label: string; fields: Definition[] }> = [
    { key: "commercial", label: "Precio y condición", fields: [
      field("price", "Precio final con IGV", p => p.priceKnown ? known(formatSoles(withIgv(p.price.price))) : known(""), true),
      field("condition", "Condición", p => known(p.condition), true),
      field("presentation", "Presentación del empaque", p => known(p.presentation), true),
    ] },
    { key: "battery", label: "Batería y uso", fields: [
      field("health", "Salud de batería", p => portable(p) || p.batteryHealth !== "" ? known(p.batteryHealth === "" ? "" : `${p.batteryHealth.replace(/%$/, "")}%`) : na(), true),
      field("cycles", "Ciclos de carga", p => cyclesApply(p) ? known(p.batteryCycles) : na(), true),
    ] },
    { key: "technical", label: "Especificaciones técnicas", fields: [
      field("processor", "Chip o procesador", p => known(p.processor)),
      field("ram", "Memoria RAM", p => computer(p) || p.ram ? known(formatRam(p.ram)) : na()),
      field("storage", "Almacenamiento", p => known(p.storage)),
      field("screen", "Pantalla / tamaño", p => p.category === "iphone" ? na() : known(screenSizeLabel(p.category, first(p.notes.watchSize, p.detail.tamaño, p.detail.tamano, p.detail.tamanio)))),
      field("model", "Versión", p => known(first(p.item.product?.iphone_model, p.item.staged?.iphone_model, p.notes.iphoneModel, p.notes.watchVersion, p.notes.watchSeries, p.detail.modelo))),
      field("connectivity", "Conectividad / SIM", p => known(first(p.notes.iphoneSimType, p.notes.simType, p.notes.watchConnection, p.detail.conectividad, p.detail.conexion, p.detail.sim, p.detail.esim))),
      field("keyboard", "Teclado", p => p.category === "macbook" ? known(keyboardLabel(first(p.item.product?.keyboard_layout, p.item.staged?.keyboard_layout))) : na()),
      field("color", "Color", p => known(p.color)),
    ] },
    { key: "physical", label: "Estado físico y accesorios", fields: [
      field("observations", "Observaciones registradas", p => known(p.conditionDescription), true),
      field("included", "Accesorios incluidos", p => { const a = accessories(p); return known(a.known ? a.included.join(", ") || "Ninguno" : ""); }, true),
      field("missingAccessories", "Accesorios no incluidos", p => { const a = accessories(p); return known(a.missing.join(", ")); }),
    ] },
    { key: "warranty", label: "Garantía", fields: [field("warranty", "Garantía registrada", p => comparisonWarranty(p.item), true)] },
    { key: "availability", label: "Disponibilidad", fields: [
      field("availability", "Estado de disponibilidad", p => known(p.availabilityLabel === "No registrado" ? "" : p.availabilityLabel), true),
      field("arrival", "Llegada estimada", p => p.availability === "preorder" ? known([p.notes.preventaDateFrom || p.notes.preventa?.from, p.notes.preventaDateTo || p.notes.preventa?.to].filter(Boolean).map(formatWarrantyDate).join(" – ")) : na()),
    ] },
  ];
  return groups.map(group => ({ key: group.key, label: group.label, rows: group.fields.map(def => {
    const values = products.map(def.read);
    const recorded = values.filter(value => value.state === "known");
    const different = new Set(recorded.map(value => norm(value.text))).size > 1;
    const incomplete = recorded.length > 0 && values.some(value => value.state === "missing");
    const relevant = values.some(value => value.state !== "na") && (def.always || recorded.length > 0);
    return relevant && (!onlyDifferences || different || incomplete) ? { key: def.key, label: def.label, values, different, incomplete } : null;
  }).filter((row): row is ComparisonRow => row !== null) })).filter(group => group.rows.length > 0);
}
