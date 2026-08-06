"use client";

import React from "react";
import { CatalogRepairItem, listCatalogRepairs, returnCatalogRepairToInventory } from "../../actions";

function displaySku(value: unknown) {
  return String(value || "").trim().replace(/^svc(?=[-_\s]*\d)/i, "MS");
}

export default function CatalogRepairsPanel({ initialItems, initialError = "" }: { initialItems: CatalogRepairItem[]; initialError?: string }) {
  const [items, setItems] = React.useState<CatalogRepairItem[]>(initialItems || []);
  const [workingId, setWorkingId] = React.useState("");
  const [message, setMessage] = React.useState(initialError);
  const [loadError, setLoadError] = React.useState(Boolean(initialError));

  const refresh = React.useCallback(async () => {
    try {
      const result = await listCatalogRepairs();
      setItems(Array.isArray(result?.items) ? result.items : []);
      setMessage("");
      setLoadError(false);
      return true;
    } catch {
      setMessage("No se pudo cargar el diagnóstico del catálogo. Intenta actualizar nuevamente.");
      setLoadError(true);
      return false;
    }
  }, []);

  const returnToInventory = async (item: CatalogRepairItem) => {
    if (!confirm(`¿Quitar "${item.title}" del catálogo y devolverlo al Inventario?\n\nNo se eliminarán sus datos.`)) return;
    setWorkingId(item.publicId);
    setMessage("");
    try {
      await returnCatalogRepairToInventory(item.publicId);
      const refreshed = await refresh();
      if (!refreshed) {
        setItems((current) => current.filter((currentItem) => currentItem.publicId !== item.publicId));
        setLoadError(false);
      }
      window.dispatchEvent(new Event("catalog-products-updated"));
      window.dispatchEvent(new Event("staged-products-updated"));
      setMessage("Producto retirado del catálogo y devuelto al Inventario.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo devolver el producto al Inventario.");
    } finally {
      setWorkingId("");
    }
  };

  return (
    <section className="rounded-2xl border bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M14.7 6.3a4 4 0 0 0-5-5L7.4 3.6l3 3 2.3-2.3a4 4 0 0 0 2 2Z" />
              <path d="m10.4 6.6-8.1 8.1a2.1 2.1 0 0 0 3 3l8.1-8.1" />
              <path d="m14 14 6 6M17 11l-3 3" />
            </svg>
          </span>
          <div>
            <h2 className="font-semibold text-gray-900">Arreglos del catálogo</h2>
            <p className="text-sm text-gray-600">Productos publicados que necesitan revisión.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${items.length ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
            {items.length ? `${items.length} con problemas` : "Sin problemas"}
          </span>
          <button onClick={() => void refresh()} className="rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Actualizar</button>
        </div>
      </div>

      {message && <p className={`mt-4 rounded-lg px-3 py-2 text-sm ${loadError ? "bg-red-50 text-red-800" : "bg-blue-50 text-blue-800"}`}>{message}</p>}
      {!items.length && !loadError ? (
        <div className="mt-5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-5 text-center text-sm text-emerald-800">
          No se detectaron publicaciones redundantes o dañadas.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <article key={item.publicId} className={`rounded-xl border p-4 ${item.severity === "critical" ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40"}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${item.severity === "critical" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                      {item.severity === "critical" ? "Problema crítico" : "Revisar"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span>SKU: {displaySku(item.sku) || "Sin SKU"}</span>
                    <span>Categoría: {item.category || "Sin categoría"}</span>
                    <span>Precio: S/ {Number(item.price || 0).toFixed(2)}</span>
                    <span>Ruta: /product/{item.slug}</span>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-gray-800">
                    {item.issues.map((issue) => (
                      <li key={issue.code} className="flex gap-2">
                        <span className={issue.severity === "critical" ? "text-red-600" : "text-amber-600"}>•</span>
                        <span>{issue.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => void returnToInventory(item)}
                  disabled={workingId === item.publicId}
                  className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:cursor-wait disabled:opacity-60"
                >
                  {workingId === item.publicId ? "Moviendo..." : "Devolver al inventario"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
