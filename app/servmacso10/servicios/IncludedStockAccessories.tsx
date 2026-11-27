"use client";
import { formatUnitCost } from "@/lib/services-accessories";

export type StockAccessory = { productoId: number; nombre: string; costoCompraUnitario?: number | null };

/**
 * Selección enviada con la venta: la unidad cuyos accesorios se mostraron, los
 * productoId entregados y la revisión de la ficha mostrada (null si Servicios
 * aún no informó accesorios para esa unidad).
 */
export type StockAccessorySelection = { unitId: string | null; items: StockAccessory[]; ids: number[]; revision: number | null };

/** Captura los accesorios de stock de la unidad al abrir la venta, todos marcados. */
export function initialStockSelection(unit: any): StockAccessorySelection {
  const unitId = unit?.id ? String(unit.id) : null;
  const rawRevision = unit?.accesorios_stock_revision;
  const revision = rawRevision === null || rawRevision === undefined || !Number.isSafeInteger(Number(rawRevision)) ? null : Number(rawRevision);
  if (revision === null) return { unitId, items: [], ids: [], revision: null };
  const items: StockAccessory[] = (Array.isArray(unit?.accesorios_stock) ? unit.accesorios_stock : [])
    .map((item: any) => ({ productoId: Number(item?.productoId), nombre: String(item?.nombre || "").trim(), costoCompraUnitario: item?.costoCompraUnitario === null || item?.costoCompraUnitario === undefined || !Number.isFinite(Number(item.costoCompraUnitario)) ? null : Number(item.costoCompraUnitario) }))
    .filter((item: StockAccessory) => Number.isSafeInteger(item.productoId) && item.productoId > 0 && item.nombre);
  return { unitId, items, ids: items.map((item) => item.productoId), revision };
}

/**
 * Campos para la acción de venta. La unidad mostrada se envía siempre: si el
 * backend vende otra unidad del grupo con accesorios distintos, rechaza la venta
 * en vez de registrar accesorios que nadie revisó.
 */
export function stockSelectionPayload(selection: StockAccessorySelection | null | undefined) {
  if (!selection) return {};
  return {
    ...(selection.unitId ? { accesoriosStockUnitId: selection.unitId } : {}),
    ...(selection.revision === null ? {} : { accesoriosStockIds: [...selection.ids], accesoriosStockRevision: selection.revision }),
  };
}

/** El backend responde así cuando la ficha cambió o la unidad vendida lleva otros accesorios. */
export function isStockAccessoryConflict(message: unknown) {
  return /accesorios incluidos/i.test(String(message || ""));
}

/** La unidad que se vendería lleva otros accesorios: reintentar el mismo modal nunca lo resuelve. */
export function isOtherUnitAccessoryConflict(message: unknown) {
  return /propia fila/i.test(String(message || ""));
}

export default function IncludedStockAccessories({
  value,
  onChange,
  disabled = false,
}: {
  value: StockAccessorySelection | null | undefined;
  onChange: (next: StockAccessorySelection) => void;
  disabled?: boolean;
}) {
  if (!value?.items.length) return null;
  return (
    <fieldset className="mb-3 rounded border px-3 py-2" data-testid="included-stock-accessories">
      <legend className="px-1 text-sm text-gray-700">Accesorios incluidos que se entregan</legend>
      {value.items.map((item) => (
        <label key={item.productoId} className="flex items-center gap-2 py-1 text-sm">
          <input
            type="checkbox"
            disabled={disabled}
            checked={value.ids.includes(item.productoId)}
            onChange={(e) => onChange({
              ...value,
              ids: e.target.checked
                ? value.items.map((other) => other.productoId).filter((id) => id === item.productoId || value.ids.includes(id))
                : value.ids.filter((id) => id !== item.productoId),
            })}
          />
          {item.nombre}
          {formatUnitCost(item.costoCompraUnitario) && <span className="text-xs text-gray-500">costo {formatUnitCost(item.costoCompraUnitario)}</span>}
        </label>
      ))}
      <p className="text-xs text-gray-500">Desmarca lo que no se entrega: Servicios lo devuelve al stock.</p>
    </fieldset>
  );
}
