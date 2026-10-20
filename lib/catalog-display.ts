import { formatStorageDisplay } from "@/lib/storage";

export function parseCatalogNotes(row: any) {
  try {
    return typeof row?.staged?.notes === "string"
      ? JSON.parse(row.staged.notes)
      : row?.staged?.notes || {};
  } catch {
    return {};
  }
}

export function uniqueText(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

/**
 * Tamaño de pantalla con su unidad según el tipo de equipo. En los iPhone el
 * campo «tamaño» guarda el número del modelo (17 = iPhone 17), no pulgadas.
 */
export function screenSizeLabel(category: string, value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const kind = String(category || "").toLowerCase();
  if (kind.includes("iphone")) return "";
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) return text;
  return kind.includes("watch") ? `${text} mm` : `${text} pulgadas`;
}

export function catalogFacts(row: any) {
  const notes = parseCatalogNotes(row);
  const specs = notes?.specs || notes || {};
  const detail = specs?.detalle || notes?.detalle || {};
  const title = String(row?.product?.title || row?.staged?.title || row?.title || row?.slug || "Producto");
  const category = String(row?.category || row?.product?.category || row?.staged?.category || specs?.tipo || notes?.tipo || "");
  const processor = String(detail?.procesador || "").trim();
  const ram = String(detail?.ram || "").trim();
  const storage = formatStorageDisplay(detail?.almacenamiento || detail?.ssd || row?.product?.storage_gb || row?.staged?.storage_gb || notes?.storageGb || notes?.storage || "");
  const batteryHealth = String(row?.product?.battery_health ?? row?.staged?.battery_health ?? notes?.batteryHealth ?? notes?.bateria?.salud ?? "").trim();
  const batteryCycles = String(row?.product?.battery_cycles ?? row?.staged?.battery_cycles ?? notes?.batteryCycles ?? notes?.bateria?.ciclos ?? "").trim();
  const sku = String(row?.product?.sku || row?.staged?.sku || notes?.manualSku || notes?.sourceSku || "").replace(/^MS(?:[-_\s]+)?/i, "").trim();
  const conditionDescription = String(detail?.detalles || detail?.productDetails || notes?.productDetails || notes?.detalles || "").trim();
  const detailImages = uniqueText([
    ...(Array.isArray(notes?.detailImages) ? notes.detailImages : []),
    ...(Array.isArray(notes?.detailPhotos) ? notes.detailPhotos : []),
    ...(Array.isArray(detail?.detailImages) ? detail.detailImages : []),
  ]);

  return {
    notes,
    specs,
    detail,
    title,
    category,
    processor,
    ram,
    storage,
    batteryHealth,
    batteryCycles,
    sku,
    conditionDescription,
    detailImages,
    hasConditionDetails: Boolean(conditionDescription || detailImages.length),
  };
}

export function detailCountLabel(imageCount: number, hasDescription = false) {
  if (imageCount === 1) return "1 detalle estético";
  if (imageCount > 1) return `${imageCount} detalles fotografiados`;
  return hasDescription ? "Estado estético informado" : "";
}

export function compactSpecs(facts: ReturnType<typeof catalogFacts>) {
  const primary = [facts.processor, facts.ram && `${facts.ram.replace(/\s*GB$/i, "")} GB`, facts.storage]
    .filter(Boolean)
    .join(" · ");
  const battery = [
    facts.batteryHealth && `Batería ${facts.batteryHealth.replace(/%$/, "")}%`,
    facts.batteryCycles && `${facts.batteryCycles} ${Number(facts.batteryCycles) === 1 ? "ciclo" : "ciclos"}`,
  ].filter(Boolean).join(" · ");
  return [primary, battery].filter(Boolean).slice(0, 2);
}

/** RAM siempre como «16 GB», venga como «16», «16GB» o «16 gb». */
export function formatRam(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const match = text.match(/^(\d+(?:[.,]\d+)?)\s*(gb)?$/i);
  return match ? `${match[1]} GB` : text;
}

export function publicSku(value: unknown) {
  return String(value || "").trim().replace(/^MS(?:[-_\s]+)?/i, "");
}

export const CATEGORY_LABELS: Record<string, string> = {
  macbook: "MacBook",
  iphone: "iPhone",
  ipad: "iPad",
  watch: "Apple Watch",
  otros: "Otros",
};

export function categoryLabel(category: unknown) {
  const key = String(category || "").toLowerCase();
  return CATEGORY_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : "Otros");
}

export function keyboardLabel(value: unknown) {
  const raw = String(value || "").trim();
  if (/^ingl[eé]s$/i.test(raw)) return "Inglés";
  if (/^espa[nñ]ol$/i.test(raw)) return "Español";
  return raw;
}

/**
 * Definiciones de cada condición. Están aquí para que la ficha, el catálogo y
 * la información de compra digan lo mismo. Evitan prometer certificaciones o
 * revisiones que la tienda no declara.
 */
export const CONDITION_INFO = [
  {
    key: "nuevo",
    label: "Nuevo",
    // No promete «sellado»: el panel no registra la presentación de la caja.
    description: "Equipo nuevo. Sus accesorios y la garantía registrada figuran en su ficha.",
    // Nuevo: discreto, en el azul suave de la marca.
    tone: "bg-[color:var(--brand-tint)] text-[color:var(--accent-strong)]",
  },
  {
    key: "open",
    label: "Open Box",
    description: "Equipo con el empaque abierto. Revisa sus fotografías, condición y accesorios en la ficha.",
    // Open Box: reconocible por el contorno azul, sin color de advertencia.
    tone: "bg-white text-[color:var(--accent-strong)] ring-1 ring-inset ring-[rgba(37,99,235,0.45)]",
  },
  {
    key: "usad",
    label: "Usado",
    description: "Equipo usado: puede tener detalles propios del uso. La batería y los detalles informados se muestran en su ficha.",
    // Usado: neutro, no es una advertencia.
    tone: "bg-[color:var(--surface-muted)] text-[color:var(--foreground)]",
  },
] as const;

export function conditionInfo(condition: unknown) {
  const value = String(condition || "").toLowerCase();
  return CONDITION_INFO.find((info) => value.includes(info.key)) || null;
}

export function conditionTone(condition: unknown) {
  return conditionInfo(condition)?.tone || "bg-white/88 text-[color:var(--foreground-soft)]";
}

export type ProductBadge =
  | { kind: "status"; label: string }
  | { kind: "preorder"; label: string }
  | { kind: "promo"; label: string }
  | { kind: "condition"; label: string }
  | { kind: "negotiable"; label: string };

/**
 * Etiquetas de una unidad, en orden de prioridad y como máximo `max`.
 * «Disponible» no se muestra: es la situación normal de lo publicado.
 * Vendido/Reservado > Preventa > promoción real > condición > negociable.
 */
export function productBadges(input: { condition?: unknown; saleType?: unknown; promoLabel?: unknown; availability?: unknown }, max = 3): ProductBadge[] {
  const saleType = String(input.saleType || "").toUpperCase();
  const availability = String(input.availability || "");
  const condition = String(input.condition || "").trim();
  const badges: ProductBadge[] = [];
  if (availability === "sold") badges.push({ kind: "status", label: "Vendido" });
  else if (availability === "reserved") badges.push({ kind: "status", label: "Reservado" });
  if (saleType === "PREVENTA") badges.push({ kind: "preorder", label: "Preventa" });
  if (saleType === "PROMOCION" && String(input.promoLabel || "").trim() && badges[0]?.kind !== "status") badges.push({ kind: "promo", label: String(input.promoLabel) });
  if (condition) badges.push({ kind: "condition", label: condition });
  if (saleType === "OFERTA" && badges[0]?.kind !== "status") badges.push({ kind: "negotiable", label: "Negociable" });
  return badges.slice(0, max);
}

/** Clases de una etiqueta (excepto «promo», que usa el sello temático de ofertas). */
export function badgeTone(badge: ProductBadge) {
  if (badge.kind === "status") return "bg-slate-900 text-white";
  // Preventa: azul intenso, distinto de cualquier condición, porque la unidad aún no está en almacén.
  if (badge.kind === "preorder") return "bg-[color:var(--accent-strong)] text-white";
  if (badge.kind === "negotiable") return "bg-[color:var(--foreground)] text-white";
  return conditionTone(badge.label);
}

export function isUsedCondition(condition: unknown) {
  const key = conditionInfo(condition)?.key;
  return key === "usad" || key === "open";
}

const CLOSED_ACCESSORY_SETS: Record<string, string[]> = {
  macbook: ["Caja", "Cubo", "Cable"],
  ipad: ["Caja", "Cubo", "Cable"],
  iphone: ["Caja", "Cubo", "Cable"],
};

const ACCESSORY_NAMES: Record<string, string> = {
  Caja: "Caja",
  Cubo: "Cargador (cubo)",
  Cable: "Cable",
};

function storedFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "si", "sí", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return null;
}

/**
 * Accesorios separados en «Incluye» y «No incluye».
 * «No incluye» solo se calcula cuando el panel registró el accesorio con sus
 * casillas (caja, cubo y cable en MacBook, iPad e iPhone). Un texto libre
 * («Otros») solo alimenta «Incluye»: no se deduce lo que falta.
 */
export function accessoryBreakdown(input: {
  category: string;
  includes?: unknown;
  includesExtra?: unknown;
  legacy?: Record<string, unknown> | null;
  cuboGeneric?: boolean;
  cableGeneric?: boolean;
}) {
  const category = String(input.category || "").toLowerCase();
  const raw = String(input.includes || "").trim();
  const extra = String(input.includesExtra || "").trim();
  const closed = CLOSED_ACCESSORY_SETS[category];
  const nameOf = (accessory: string) => {
    if (accessory === "Cubo" && input.cuboGeneric) return "Cargador (cubo genérico)";
    if (accessory === "Cable" && input.cableGeneric) return "Cable genérico";
    return ACCESSORY_NAMES[accessory] || accessory;
  };

  if (/^otros?$/i.test(raw)) return { included: extra ? [extra] : [], missing: [] as string[], known: Boolean(extra), none: false };
  if (/^ningun|^no incluye/i.test(raw)) {
    return { included: [] as string[], missing: closed ? closed.map(nameOf) : [], known: true, none: true };
  }

  if (closed) {
    const legacy = input.legacy || {};
    const flags = closed.map((accessory) => {
      const flag = storedFlag(legacy[accessory.toLowerCase()]);
      // `\\b` doble: en una plantilla, `\b` es el carácter de retroceso y nunca coincidía.
      const fromText = raw ? new RegExp(`\\b${accessory}\\b`, "i").test(raw) : null;
      return { accessory, has: flag ?? fromText };
    });
    if (raw || flags.some((flag) => flag.has !== null)) {
      return {
        included: flags.filter((flag) => flag.has === true).map((flag) => nameOf(flag.accessory)),
        missing: flags.filter((flag) => flag.has === false).map((flag) => nameOf(flag.accessory)),
        known: true,
        none: flags.every((flag) => flag.has === false),
      };
    }
    return { included: [] as string[], missing: [] as string[], known: false, none: false };
  }

  // Apple Watch y otros: el texto registrado se muestra tal cual.
  const parts = raw ? raw.split(/\s*\+\s*/).filter(Boolean) : [];
  return { included: parts, missing: [] as string[], known: parts.length > 0, none: false };
}
