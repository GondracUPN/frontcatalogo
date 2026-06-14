"use client";
import React from "react";
import { listSales, unsellProduct, updateSale } from "../../actions";

type Sale = {
  id: string;
  product_id: string;
  sku?: string;
  sale_price?: string | number;
  sold_at?: string;
  title?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_kind?: string | null;
  sale_place_type?: string | null;
  sale_location?: string | null;
};

function formatDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function inputDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function phone(value: unknown) {
  return String(value || "").replace(/\D+/g, "") || "-";
}

function salePlace(sale: Sale) {
  const type = String(sale.sale_place_type || "").trim();
  const location = String(sale.sale_location || "").trim();
  if (type === "otro") return location || "-";
  if (type === "almacen") return "Almacen";
  return "-";
}

export default function SoldProductsPanel({ initialSales }: { initialSales: Sale[] }) {
  const [sales, setSales] = React.useState<Sale[]>(initialSales || []);
  const [loading, setLoading] = React.useState((initialSales || []).length === 0);
  const [open, setOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Sale | null>(null);
  const [editForm, setEditForm] = React.useState({
    saleDate: "",
    salePrice: "",
  });

  const refresh = React.useCallback(async () => {
    try {
      const res = await listSales();
      setSales(Array.isArray(res?.items) ? (res.items as Sale[]) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh().catch(() => {});
    const onSalesUpdated = () => {
      refresh().catch(() => {});
    };
    window.addEventListener("sales-updated", onSalesUpdated);
    return () => window.removeEventListener("sales-updated", onSalesUpdated);
  }, [refresh]);

  const restoreSale = async (sale: Sale) => {
    if (!confirm("Volver este producto a venta?")) return;
    setBusyId(sale.id);
    try {
      await unsellProduct(sale.product_id, sale.id);
      await refresh();
      window.dispatchEvent(new Event("catalog-products-updated"));
    } finally {
      setBusyId(null);
    }
  };

  const openEditor = (sale: Sale) => {
    setEditing(sale);
    setEditForm({
      saleDate: inputDate(sale.sold_at),
      salePrice: String(sale.sale_price ?? ""),
    });
  };

  const saveEdit = async () => {
    if (!editing || busyId) return;
    if (!editForm.saleDate || editForm.salePrice === "") {
      alert("Completa la fecha y el precio de venta");
      return;
    }
    setBusyId(editing.id);
    try {
      const result = await updateSale(editing.id, editForm);
      const updated = result?.item as Sale | undefined;
      if (updated) {
        setSales((current) => current.map((sale) => sale.id === editing.id ? { ...sale, ...updated } : sale));
      } else {
        await refresh();
      }
      setEditing(null);
    } catch {
      alert("No se pudo actualizar la venta");
    } finally {
      setBusyId(null);
    }
  };

  const recentSales = sales.slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Vendidos</h2>
        <button onClick={() => setOpen(true)} className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white">
          Lista Completa
        </button>
      </div>
      <div className="overflow-auto max-h-[340px]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700">
              <th className="p-2">Producto</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Precio venta</th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {recentSales.map((sale) => (
              <tr key={sale.id} className="border-t">
                <td className="p-2 text-gray-900">{sale.title || "-"}</td>
                <td className="p-2 text-gray-900">{sale.sku || "-"}</td>
                <td className="p-2 text-gray-900">S/ {Number(sale.sale_price || 0).toFixed(2)}</td>
                <td className="p-2 text-gray-900">{formatDate(sale.sold_at)}</td>
                <td className="p-2">
                  <button
                    onClick={() => openEditor(sale)}
                    className="rounded bg-indigo-600 px-3 py-1 text-white"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {!recentSales.length && (
              <tr>
                <td className="p-2 text-gray-500" colSpan={5}>
                  {loading ? "Cargando ventas..." : "Sin registros"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl p-5 text-gray-900 max-h-[86vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Productos vendidos</h3>
              <button onClick={() => setOpen(false)} aria-label="Cerrar">
                X
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-700">
                  <th className="p-2">Producto</th>
                  <th className="p-2">SKU</th>
                  <th className="p-2">Precio</th>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2">Numero</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Lugar</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-t">
                    <td className="p-2">{sale.title || "-"}</td>
                    <td className="p-2">{sale.sku || "-"}</td>
                    <td className="p-2">S/ {Number(sale.sale_price || 0).toFixed(2)}</td>
                    <td className="p-2">{formatDate(sale.sold_at)}</td>
                    <td className="p-2">{sale.customer_name || "-"}</td>
                    <td className="p-2">{phone(sale.customer_phone)}</td>
                    <td className="p-2">{sale.customer_kind || "-"}</td>
                    <td className="p-2">{salePlace(sale)}</td>
                    <td className="p-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => openEditor(sale)}
                        className="rounded bg-indigo-600 px-3 py-1 text-white"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => restoreSale(sale)}
                        disabled={busyId === sale.id}
                        className="rounded bg-emerald-600 px-3 py-1 text-white disabled:opacity-60"
                      >
                        {busyId === sale.id ? "Guardando..." : "Volver a vender"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!sales.length && (
                  <tr>
                    <td className="p-2 text-gray-500" colSpan={9}>
                      Sin registros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 text-gray-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Editar venta</h3>
                <p className="mt-1 text-sm text-gray-500">{editing.title || editing.sku || "Producto"}</p>
              </div>
              <button onClick={() => setEditing(null)} aria-label="Cerrar">X</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-gray-700">Fecha de venta</label>
                <input
                  type="date"
                  value={editForm.saleDate}
                  onChange={(e) => setEditForm((current) => ({ ...current, saleDate: e.target.value }))}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-700">Precio de venta (S/)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.salePrice}
                  onChange={(e) => setEditForm((current) => ({ ...current, salePrice: e.target.value }))}
                  className="w-full rounded border px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="rounded border px-4 py-2">
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={busyId === editing.id}
                className="rounded bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
              >
                {busyId === editing.id ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
