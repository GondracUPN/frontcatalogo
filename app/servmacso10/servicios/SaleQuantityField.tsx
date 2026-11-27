"use client";
import { accessoryPackTotal, getAccessoryPack } from "@/lib/accessories";

/** Cantidad entera 1..stock válida para vender un accesorio suelto, o null si no lo es. */
export function parseSaleQuantity(raw: string, stock: number): number | null {
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n < 1) return null;
  return Number.isFinite(stock) && stock >= 1 && n > stock ? null : n;
}

/** Importe total de la venta suelta: precio unitario por cantidad, con la presentación (paquete) si la ficha la define. */
export function saleTotal(product: Record<string, any>, unitPrice: string | number, quantity: number): number {
  return accessoryPackTotal(Number(unitPrice) || 0, quantity, getAccessoryPack(product));
}

/** Campo «Cantidad» de los modales de venta; solo para accesorios sueltos. */
export default function SaleQuantityField({ quantity, stock, unitPrice, total, onChange, disabled = false }: {
  quantity: string;
  stock: number;
  unitPrice: string | number;
  total: number;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const qty = parseSaleQuantity(quantity, stock);
  return (
    <div className="mb-3" data-testid="sale-quantity">
      <label className="mb-1 block text-sm text-gray-700">Cantidad{Number.isFinite(stock) && stock >= 1 ? ` (disponibles: ${stock})` : ""}</label>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        max={Number.isFinite(stock) && stock >= 1 ? stock : undefined}
        step={1}
        disabled={disabled}
        value={quantity}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 w-full rounded border px-3 py-2"
      />
      {qty === null ? (
        <p className="mt-1 text-xs text-red-700">Indica una cantidad entera entre 1 y {Number.isFinite(stock) && stock >= 1 ? stock : "el stock"}.</p>
      ) : (
        <p className="mt-1 text-xs text-gray-600">Precio unitario S/ {(Number(unitPrice) || 0).toFixed(2)} · Total S/ {total.toFixed(2)}</p>
      )}
    </div>
  );
}
