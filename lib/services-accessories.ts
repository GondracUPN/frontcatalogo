/** Contrato GET/PUT /admin/staged/:id/services-accessories (accesorios de Servicios vinculados a un equipo MS-n). */
export type ServicesAccessoryItem = { productoId: number; nombre: string; costoCompraUnitario: number | null };
export type ServicesAccessoryOption = ServicesAccessoryItem & { codigo: string; disponible: number; fusionAccesorioId?: number | null };

/** Opción del selector: un lote suelto o todos los lotes fusionados en Servicios como uno solo. */
export type ServicesAccessoryGroup = {
  key: string;
  nombre: string;
  codigos: string[];
  disponible: number;
  /** Costo promedio ponderado por unidades disponibles (null si ningún lote tiene costo). */
  costoCompraUnitario: number | null;
  /** Lotes con stock, del más antiguo al más nuevo: se reserva el primero no incluido. */
  lotes: ServicesAccessoryOption[];
};

/**
 * Agrupa los lotes fusionados (mismo fusionAccesorioId): una sola opción con el stock total y el costo
 * promedio. Los lotes sin fusión siguen siendo opciones propias. Un grupo ya incluido en el equipo se oculta.
 */
export function groupAvailableAccessories(available: ServicesAccessoryOption[], selectedIds: Set<number>): ServicesAccessoryGroup[] {
  const groups = new Map<string, ServicesAccessoryOption[]>();
  for (const option of available) {
    const key = option.fusionAccesorioId ? `fusion-${option.fusionAccesorioId}` : `lote-${option.productoId}`;
    groups.set(key, [...(groups.get(key) || []), option]);
  }
  const result: ServicesAccessoryGroup[] = [];
  for (const [key, lots] of groups) {
    if (lots.some((lot) => selectedIds.has(lot.productoId))) continue;
    const withStock = lots.filter((lot) => Number(lot.disponible) > 0).sort((a, b) => a.productoId - b.productoId);
    if (!withStock.length) continue;
    const disponible = withStock.reduce((sum, lot) => sum + Number(lot.disponible), 0);
    const costed = withStock.filter((lot) => lot.costoCompraUnitario !== null && lot.costoCompraUnitario !== undefined && Number.isFinite(Number(lot.costoCompraUnitario)));
    const units = costed.reduce((sum, lot) => sum + Number(lot.disponible), 0);
    const costoCompraUnitario = units ? Math.round((costed.reduce((sum, lot) => sum + Number(lot.costoCompraUnitario) * Number(lot.disponible), 0) / units) * 100) / 100 : null;
    result.push({ key, nombre: withStock[0].nombre, codigos: withStock.map((lot) => lot.codigo), disponible, costoCompraUnitario, lotes: withStock });
  }
  // Mismo orden que Servicios: lo más reciente primero.
  return result.sort((a, b) => Math.max(...b.lotes.map((l) => l.productoId)) - Math.max(...a.lotes.map((l) => l.productoId)));
}
export type ServicesAccessoriesState = {
  productoId?: number;
  revision: number;
  accesorios: ServicesAccessoryItem[];
  disponibles: ServicesAccessoryOption[];
};

/** Equipo vinculado a Servicios: SKU MS-<n> (o el alias heredado SVC-<n>), no accesorio. */
export function isServicesLinkedSku(sku: unknown) {
  return /^(?:MS|SVC)[-_\s]*\d+$/i.test(String(sku || "").trim());
}

export function formatUnitCost(value: unknown) {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) ? "" : `S/ ${n.toFixed(2)}`;
}

/**
 * Costo de compra unitario de un accesorio sincronizado: notes.costoCompraUnitario; si no existe, el total
 * histórico (valor.costoTotal) dividido por la cantidad comprada del lote si Servicios la guardó.
 * Devuelve null si no hay costo; `derived: false` cuando solo se conoce el total.
 */
export function accessoryUnitCost(notes: Record<string, any> | null | undefined): number | null {
  const n = notes || {};
  const direct = n.costoCompraUnitario;
  if (direct !== null && direct !== undefined && direct !== "" && Number.isFinite(Number(direct)) && Number(direct) >= 0) return Number(direct);
  const v = n.valor || n.specs?.valor || {};
  const total = Number(v?.costoTotal ?? v?.valorSoles ?? 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  const qtyCandidates = [v?.cantidad, v?.cantidadComprada, n.cantidadComprada, n.cantidadInicial, n.stockInicial, v?.stockInicial];
  for (const raw of qtyCandidates) {
    const q = Number(raw);
    if (Number.isSafeInteger(q) && q > 1) return Math.round((total / q) * 100) / 100;
  }
  return total;
}
