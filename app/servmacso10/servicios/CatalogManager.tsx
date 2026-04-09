"use client";
import React from "react";
import StagedPublishModal from "./PublishModal";
import { listCatalog, listSales, markProductSold, unpublishProduct, unsellProduct } from "../../actions";

type CatalogRow = {
  id: string;
  slug: string;
  images?: string[];
  product?: { id: string; sku: string; title: string; price: string; status?: string };
  staged?: any;
};

export default function CatalogManager({ initialItems }: { initialItems: CatalogRow[] }) {
  const [items, setItems] = React.useState<CatalogRow[]>(initialItems || []);
  const [open, setOpen] = React.useState<any | null>(null);
  const [soldModal, setSoldModal] = React.useState<{ row: CatalogRow; date: string; price: string } | null>(null);
  const [sales, setSales] = React.useState<Array<{ id: string; product_id: string; sku: string; sale_price: string; sold_at: string; title?: string }>>([]);

  React.useEffect(() => {
    (async () => {
      try {
        const { items } = await listSales();
        setSales(items as any);
      } catch {}
    })();
  }, []);

  const toStagedShape = (row: CatalogRow) => {
    const base = row.staged
      ? { ...row.staged }
      : {
          id: undefined as any,
          title: row.product?.title || "",
          price: row.product?.price || "0",
          images: row.images || [],
          notes: row.staged?.notes || null,
          sku: row.product?.sku || "",
          status: "published",
        };
    if ((!base.images || base.images.length === 0) && Array.isArray(row.images)) base.images = row.images;
    return base;
  };

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-700">
            <th className="p-2">Título</th>
            <th className="p-2">SKU</th>
            <th className="p-2">Precio</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2 text-gray-900 font-medium">{row.product?.title || row.staged?.title || row.slug}</td>
              <td className="p-2 text-gray-900">{row.product?.sku || row.staged?.sku || "-"}</td>
              <td className="p-2 text-gray-900">S/ {Number(row.product?.price || 0).toFixed(2)}</td>
              <td className="p-2 flex gap-2">
                <button
                  onClick={() => {
                    if (!row.staged?.id) {
                      alert("No se puede editar: falta referencia de inventario");
                      return;
                    }
                    setOpen(toStagedShape(row));
                  }}
                  className="px-3 py-1 rounded bg-indigo-600 text-white"
                >
                  Editar
                </button>
                <button
                  onClick={() => setSoldModal({ row, date: new Date().toISOString().slice(0, 10), price: String(row.product?.price || 0) })}
                  className="px-3 py-1 rounded bg-amber-600 text-white"
                >
                  Vendido
                </button>
                <button
                  onClick={async () => {
                    try {
                      await unpublishProduct(row.product?.id || row.id);
                      setItems((arr) => arr.filter((r) => r.id !== row.id));
                    } catch {
                      alert("No se pudo despublicar");
                    }
                  }}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <StagedPublishModal
          item={open}
          onClose={() => setOpen(null)}
          onSaved={async () => {
            try {
              const { items } = await listCatalog();
              setItems(items as any);
            } catch {}
            setOpen(null);
          }}
        />
      )}

      {soldModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 text-gray-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Marcar como vendido</h3>
              <button onClick={() => setSoldModal(null)} aria-label="Cerrar">
                ×
              </button>
            </div>
            <label className="block text-sm text-gray-700 mb-1">Fecha de venta</label>
            <input
              type="date"
              value={soldModal.date}
              onChange={(e) => setSoldModal({ ...soldModal, date: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <label className="block text-sm text-gray-700 mb-1">Precio de venta (S/)</label>
            <input
              id="salePriceInput"
              type="number"
              value={soldModal.price}
              onChange={(e) => setSoldModal({ ...soldModal, price: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setSoldModal(null)} className="px-3 py-1 rounded border">
                Cancelar
              </button>
                <button
                  className="px-3 py-1 rounded bg-amber-600 text-white"
                  onClick={async () => {
                    try {
                      const pid = soldModal.row.product?.id || soldModal.row.id;
                      await markProductSold(pid, soldModal.date, soldModal.price);
                      setItems((arr) => arr.filter((r) => r.id !== soldModal.row.id));
                      try {
                        const { items } = await listSales();
                      setSales(items as any);
                    } catch {}
                    setSoldModal(null);
                  } catch {
                    alert("No se pudo marcar como vendido");
                  }
                }}
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Vendidos</h2>
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
            {sales.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2 text-gray-900">{s.title || "-"}</td>
                <td className="p-2 text-gray-900">{s.sku}</td>
                <td className="p-2 text-gray-900">S/ {Number(s.sale_price || 0).toFixed(2)}</td>
                <td className="p-2 text-gray-900">{new Date(s.sold_at).toLocaleDateString()}</td>
                <td className="p-2">
                  <button
                    className="px-3 py-1 rounded bg-emerald-600 text-white"
                    onClick={async () => {
                      try {
                        await unsellProduct(s.product_id);
                        try {
                          const { items } = await listCatalog();
                          setItems(items as any);
                        } catch {}
                        try {
                          const { items } = await listSales();
                          setSales(items as any);
                        } catch {}
                      } catch {
                        alert("No se pudo revertir la venta");
                      }
                    }}
                  >
                    Volver a vender
                  </button>
                </td>
              </tr>
            ))}
            {!sales.length && (
              <tr>
                <td className="p-2 text-gray-500" colSpan={5}>
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
