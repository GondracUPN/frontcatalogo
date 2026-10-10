"use client";

import React from "react";
import { listAdminCatalog } from "../../actions";

type CatalogRow = {
  id: string;
  slug?: string | null;
  product?: { title?: string; sku?: string; sale_type?: string; discount?: number | string };
  staged?: { title?: string; sku?: string; sale_type?: string; discount?: number | string; notes?: string | Record<string, unknown> };
};

function saleType(row: CatalogRow) {
  let notes: Record<string, unknown> = {};
  try {
    notes = typeof row.staged?.notes === "string" ? JSON.parse(row.staged.notes) : row.staged?.notes || {};
  } catch {}
  return String(row.staged?.sale_type || row.product?.sale_type || notes.saleType || "").toUpperCase();
}

export default function PromotionsButton() {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [items, setItems] = React.useState<CatalogRow[]>([]);

  async function showPromotions() {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const result = await listAdminCatalog();
      setItems((result.items as CatalogRow[]).filter((row) => saleType(row) === "PROMOCION"));
    } catch {
      setError("No se pudieron cargar las promociones. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={showPromotions} className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2">
        Promociones
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Productos en promoción" className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-gray-900">Productos en promoción</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar promociones" className="rounded px-3 py-1 text-2xl text-gray-600 hover:bg-gray-100">×</button>
            </div>
            {loading ? <p className="text-gray-600">Cargando promociones…</p> : error ? <p className="text-red-700">{error}</p> : items.length === 0 ? (
              <p className="text-gray-600">No hay productos publicados en promoción.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((row) => {
                  const title = row.product?.title || row.staged?.title || "Producto sin título";
                  const sku = row.product?.sku || row.staged?.sku;
                  const discount = Number(row.product?.discount ?? row.staged?.discount ?? 0);
                  return (
                    <li key={row.id} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900">{title}</p>
                          {sku && <p className="text-sm text-gray-600">SKU: {sku}</p>}
                        </div>
                        {discount > 0 && <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">En promoción</span>}
                      </div>
                      {row.slug && <a href={`/product/${encodeURIComponent(row.slug)}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline">Ver producto</a>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
