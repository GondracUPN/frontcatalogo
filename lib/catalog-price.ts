// Única fuente del precio público de un equipo publicado. Antes había cinco
// copias (catálogo, ficha, comparador, novedades, carrito) con pequeñas
// diferencias, p. ej. en la etiqueta «Ahorra S/…». El backend sigue siendo el
// que fija los precios; aquí solo se interpreta la fila que devuelve.

export const IGV_RATE = 0.18;

export function withIgv(price: number) {
  return Number(price || 0) * (1 + IGV_RATE);
}

/** Importe en soles con separador de miles peruano: 6,000.00 */
export function formatSoles(value: number) {
  return `S/ ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function notesOf(row: any) {
  const raw = row?.staged?.notes;
  if (raw && typeof raw === "string") {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw || {};
}

export type CatalogPrice = {
  /** Precio vigente sin IGV. */
  price: number;
  /** Precio anterior (tachado) cuando hay promoción o precio de lista. */
  compareAt: number | null;
  saleType: string;
  /** «X% OFF» o «Ahorra S/ …» solo en promociones. */
  promoLabel: string;
};

export function catalogPrice(row: any): CatalogPrice {
  const notes = notesOf(row);
  const product = row?.product || {};
  const staged = row?.staged || {};
  const saleType = String(product.sale_type || staged.sale_type || notes?.saleType || "").toUpperCase();
  const salePrice = Number(product.price ?? staged.price ?? 0) || 0;
  const discount = Number(product.discount ?? staged.discount ?? notes?.discount ?? notes?.descuentoPorc ?? 0) || 0;
  const finalPrice = product.final_price ?? staged.final_price ?? notes?.finalPrice ?? null;

  if (saleType === "PROMOCION") {
    const mode = String(notes?.discountMode || notes?.discountType || "percent").toLowerCase();
    const computed = finalPrice !== null && finalPrice !== undefined && finalPrice !== ""
      ? Number(finalPrice)
      : +(mode === "amount" ? Math.max(0, salePrice - discount) : salePrice * (1 - discount / 100)).toFixed(2);
    const price = Number.isFinite(computed) && computed > 0 ? computed : salePrice;
    const compareAt = salePrice || null;
    const savings = compareAt && compareAt > price ? +(compareAt - price).toFixed(2) : 0;
    const promoLabel = mode === "amount" && savings > 0
      ? `Ahorra S/ ${savings.toFixed(2)}`
      : discount > 0
        ? `${discount}% OFF`
        : savings > 0
          ? `Ahorra S/ ${savings.toFixed(2)}`
          : "";
    return { price, compareAt, saleType, promoLabel };
  }

  let price = salePrice;
  let compareAt: number | null = null;
  if (!saleType && typeof notes?.precioLista !== "undefined") {
    const listPrice = Number(notes.precioLista || 0);
    compareAt = listPrice || null;
    if (price <= 0 && listPrice > 0) {
      const computed = +(listPrice * (1 - Number(notes?.descuentoPorc || 0) / 100)).toFixed(2);
      if (Number.isFinite(computed) && computed > 0) price = computed;
    }
  }
  return { price, compareAt, saleType, promoLabel: "" };
}
