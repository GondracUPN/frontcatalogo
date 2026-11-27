/**
 * Compatibilidad de accesorios con modelos Apple.
 * notes.modelosCompatibles = edición manual (prioridad, aunque esté vacía);
 * notes.servicesModelosCompatibles = lista que envía Servicios en cada snapshot.
 */
export type CompatibleModelRow = {
  id: string;
  family: "iphone" | "ipad" | "macbook";
  range: string;
  label: string;
  screen: string;
  chip: string;
  year: number;
};

export const COMPATIBLE_FAMILIES: Array<{ id: CompatibleModelRow["family"]; label: string }> = [
  { id: "iphone", label: "iPhone" },
  { id: "ipad", label: "iPad" },
  { id: "macbook", label: "MacBook" },
];

export const NO_SCREEN = "Sin tamaño";
export const MAX_MODELS = 200;
const MAX_LENGTH = 120;

/** Recorta, descarta vacíos o demasiado largos, quita repetidos (sin distinguir mayúsculas) y limita a 200. */
export function cleanCompatibleModels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const label = item.trim();
    const key = label.toLowerCase();
    if (!label || label.length > MAX_LENGTH || seen.has(key)) continue;
    seen.add(key);
    result.push(label);
    if (result.length >= MAX_MODELS) break;
  }
  return result;
}

export function parseNotesObject(notes: unknown): Record<string, any> {
  try {
    const value = typeof notes === "string" ? JSON.parse(notes) : notes;
    return value && typeof value === "object" ? (value as Record<string, any>) : {};
  } catch {
    return {};
  }
}

/** Manual si existe como array (incluso vacía); si no, la de Servicios; si no, []. */
export function effectiveCompatibleModels(notes: unknown): string[] {
  const n = parseNotesObject(notes);
  if (Array.isArray(n.modelosCompatibles)) return cleanCompatibleModels(n.modelosCompatibles);
  if (Array.isArray(n.servicesModelosCompatibles)) return cleanCompatibleModels(n.servicesModelosCompatibles);
  return [];
}

/** Hay edición manual guardada (aunque sea una lista vacía). */
export function hasManualCompatibleModels(notes: unknown): boolean {
  return Array.isArray(parseNotesObject(notes).modelosCompatibles);
}

/**
 * Lista efectiva de un producto: la pública (`compatibleModels`, solo nombres) o, en el panel,
 * la calculada desde las notas de la ficha.
 */
export function compatibleModelsOf(product: Record<string, any> | null | undefined): string[] {
  const direct = product?.compatibleModels ?? product?.staged?.compatibleModels;
  if (Array.isArray(direct)) return cleanCompatibleModels(direct);
  return effectiveCompatibleModels(product?.staged?.notes ?? product?.notes);
}

export function compatibleModelsText(models: string[]): string {
  return models.length ? `Compatible con: ${compactCompatibleModels(models)}` : "";
}

/**
 * Texto público de la compatibilidad: los modelos que solo se diferencian por el chip se agrupan.
 * «iPad Air 13″ (M4), iPad Air 13″ (M3)» → «iPad Air 13″ (M3, M4)». Los chips se ordenan de menor a mayor.
 */
export function compactCompatibleModels(models: string[]): string {
  const groups = new Map<string, { base: string; chips: string[]; whole: boolean }>();
  for (const model of models) {
    const found = /^(.*\S)\s*\(([^()]+)\)\s*$/.exec(model.trim());
    // Solo se agrupan chips (M1…M4, A12X…): «(Intel, 2020)» o «(5.ª generación)» quedan como modelo aparte.
    const match = found && /^(?:M\d+|A\d+[A-Z]?)(?:\s+(?:Pro|Max|Ultra|Bionic))?$/i.test(found[2].trim()) ? found : null;
    const base = match ? match[1] : model.trim();
    const key = base.toLowerCase();
    const group = groups.get(key) || { base, chips: [], whole: false };
    if (match) {
      if (!group.chips.some((chip) => chip.toLowerCase() === match[2].trim().toLowerCase())) group.chips.push(match[2].trim());
    } else {
      group.whole = true; // el modelo sin chip ya cubre todas las variantes
    }
    groups.set(key, group);
  }
  return [...groups.values()].map(({ base, chips, whole }) => {
    if (whole || !chips.length) return base;
    const sorted = [...chips].sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
    return `${base} (${sorted.join(", ")})`;
  }).join(", ");
}

/** Filas válidas del endpoint (descarta las mal formadas). */
export function readCompatibleModelRows(value: unknown): CompatibleModelRow[] {
  if (!Array.isArray(value)) return [];
  const rows: CompatibleModelRow[] = [];
  for (const raw of value as any[]) {
    const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
    const family = raw?.family;
    // Pantalla o chip vacíos son válidos: la pantalla se agrupa como «Sin tamaño».
    const row = { id: text(raw?.id), family, range: text(raw?.range), label: text(raw?.label), screen: text(raw?.screen) || NO_SCREEN, chip: text(raw?.chip), year: Number(raw?.year) };
    if (!row.id || !row.range || !row.label || !Number.isFinite(row.year) || !COMPATIBLE_FAMILIES.some((f) => f.id === family)) continue;
    rows.push(row as CompatibleModelRow);
  }
  return rows;
}

/** Gamas de una familia, por año más reciente primero. */
export function rangesOfFamily(rows: CompatibleModelRow[], family: string): string[] {
  const latest = new Map<string, number>();
  for (const row of rows) if (row.family === family) latest.set(row.range, Math.max(latest.get(row.range) ?? 0, row.year));
  return [...latest.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([range]) => range);
}

export function screensOf(rows: CompatibleModelRow[], family: string, range: string): string[] {
  return [...new Set(rows.filter((r) => r.family === family && r.range === range).map((r) => r.screen))].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
}

/** Modelos visibles en la cascada Familia → Gama → Tamaño ("" = todos los tamaños), más recientes primero. */
export function modelsOf(rows: CompatibleModelRow[], family: string, range: string, screen: string): CompatibleModelRow[] {
  return rows
    .filter((r) => r.family === family && r.range === range && (!screen || r.screen === screen))
    .sort((a, b) => b.year - a.year || a.label.localeCompare(b.label, "es", { numeric: true }));
}
