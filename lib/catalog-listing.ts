// Datos de los listados (categorías, búsqueda y ofertas) antes de pasarlos al
// navegador. CategoryBrowser es un componente cliente: todo lo que recibe se
// serializa dos veces en la página (HTML y carga RSC). Las tarjetas usan una
// sola foto y solo cuentan las fotos del estado estético, así que se envía la
// primera foto y el conteo, no las URL de toda la galería.

type Row = Record<string, any>;

function parseNotes(notes: unknown): Record<string, any> {
  if (!notes) return {};
  if (typeof notes === "string") {
    try {
      const parsed = JSON.parse(notes);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof notes === "object" ? (notes as Record<string, any>) : {};
}

function textList(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
}

/**
 * Fila para tarjetas y filtros. Conserva todos los campos de texto (filtros,
 * búsqueda, precio y especificaciones) y reemplaza:
 * - `images` por su primera foto (o la primera de la ficha staged);
 * - las listas de fotos del estado estético por marcadores cortos, uno por
 *   foto distinta, para que `catalogFacts` siga contando lo mismo.
 */
export function listingRow(row: Row): Row {
  const staged = row?.staged || null;
  const firstImage = textList(row?.images)[0] || textList(staged?.images)[0] || "";
  const notes = parseNotes(staged?.notes);
  const specs = notes?.specs || notes;
  const detail = specs?.detalle || notes?.detalle || {};
  const detailPhotos = Array.from(new Set([
    ...textList(notes?.detailImages),
    ...textList(notes?.detailPhotos),
    ...textList(detail?.detailImages),
  ]));

  const slimNotes: Record<string, any> = { ...notes, detailImages: detailPhotos.map((_, index) => `detalle-${index + 1}`) };
  delete slimNotes.detailPhotos;
  const slimDetail = (value: any) => {
    if (!value || typeof value !== "object" || !("detailImages" in value)) return value;
    const rest = { ...value };
    delete rest.detailImages;
    return rest;
  };
  if (slimNotes.detalle) slimNotes.detalle = slimDetail(slimNotes.detalle);
  if (slimNotes.specs && typeof slimNotes.specs === "object") slimNotes.specs = { ...slimNotes.specs, detalle: slimDetail(slimNotes.specs.detalle) };

  return {
    ...row,
    images: firstImage ? [firstImage] : [],
    staged: staged ? { ...staged, images: undefined, notes: slimNotes } : staged,
  };
}

export function listingRows(rows: Row[] | null | undefined) {
  return Array.isArray(rows) ? rows.map(listingRow) : [];
}

/**
 * En una regeneración ISR, lanzar el error conserva la última versión buena de
 * la página. Mostrar «catálogo no disponible» la reemplazaría durante 5 minutos
 * por un fallo momentáneo de la API. Solo en el build se muestra el aviso, para
 * no bloquear el despliegue si la API no está accesible.
 */
export function isBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}
