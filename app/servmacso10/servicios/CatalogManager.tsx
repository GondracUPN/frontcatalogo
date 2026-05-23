"use client";
import React from "react";
import StagedPublishModal from "./PublishModal";
import { listAdminCatalog, listSales, markProductSold, unpublishProduct, unsellProduct } from "../../actions";

type CatalogRow = {
  id: string;
  slug?: string | null;
  category?: string | null;
  is_published?: boolean;
  images?: string[];
  product?: { id: string; sku: string; title: string; price: string; status?: string; variant_group?: string | null };
  staged?: any;
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "macbook", label: "MacBooks" },
  { value: "ipad", label: "iPads" },
  { value: "iphone", label: "iPhones" },
  { value: "watch", label: "Apple Watch" },
  { value: "accesorios", label: "Accesorios" },
  { value: "otros", label: "Otros" },
];

function normalizeCategory(value: unknown) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("mac")) return "macbook";
  if (raw.includes("ipad")) return "ipad";
  if (raw.includes("iphone")) return "iphone";
  if (raw.includes("watch")) return "watch";
  if (raw.includes("accesorio") || raw.includes("airpod")) return "accesorios";
  return raw;
}

export default function CatalogManager({ initialItems }: { initialItems: CatalogRow[] }) {
  const [items, setItems] = React.useState<CatalogRow[]>(initialItems || []);
  const [categoryFilter, setCategoryFilter] = React.useState("all");
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
          variant_group: row.product?.variant_group || row.staged?.variant_group || "",
        };
    if (!base.variant_group) base.variant_group = row.product?.variant_group || row.staged?.variant_group || "";
    if ((!base.images || base.images.length === 0) && Array.isArray(row.images)) base.images = row.images;
    return base;
  };

  const rowCategory = (row: CatalogRow) => {
    const staged = row.staged || {};
    const notes = (() => {
      try {
        return staged?.notes && typeof staged.notes === "string" ? JSON.parse(staged.notes) : staged?.notes || {};
      } catch {
        return {};
      }
    })();
    const title = row.product?.title || staged.title || row.slug || "";
    return normalizeCategory(
      row.category ||
        staged.category ||
        notes?.category ||
        notes?.specs?.tipo ||
        notes?.tipo ||
        title
    );
  };

  const filteredItems = React.useMemo(
    () => items.filter((row) => categoryFilter === "all" || rowCategory(row) === categoryFilter),
    [categoryFilter, items]
  );

  const variantLabel = (row: CatalogRow) => {
    const staged = (row.staged || {}) as any;
    const product = (row.product || {}) as any;
    const notes = (() => {
      try {
        return staged?.notes && typeof staged.notes === "string" ? JSON.parse(staged.notes) : staged?.notes || {};
      } catch {
        return {};
      }
    })();
    return [
      product.variant_group || staged.variant_group ? `Grupo: ${product.variant_group || staged.variant_group}` : "",
      product.sku || staged.sku ? `SKU: ${product.sku || staged.sku}` : "",
      product.title || staged.title ? "" : "",
      product.status === "sold" ? "Vendido" : "",
      staged.color || notes?.color ? `Color: ${staged.color || notes?.color}` : "",
      staged.battery_health || notes?.batteryHealth ? `Bateria: ${staged.battery_health || notes?.batteryHealth}%` : "",
      staged.includes || notes?.includes ? `Incluye: ${staged.includes || notes?.includes}` : "",
    ].filter(Boolean).join(" · ");
  };

  return (
    <div className="overflow-auto">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="block text-sm font-medium text-gray-700">Filtrar por tipo</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 w-full min-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-sm text-gray-600">
          {filteredItems.length} de {items.length} productos
        </div>
      </div>

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
          {filteredItems.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2 text-gray-900 font-medium">
                <div>{row.product?.title || row.staged?.title || row.slug}</div>
                {variantLabel(row) && <div className="mt-1 text-xs font-normal text-gray-500">{variantLabel(row)}</div>}
              </td>
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
                {row.slug && row.is_published && (
                  <a
                    href={`/product/${row.slug}`}
                    className="px-3 py-1 rounded bg-gray-900 text-white"
                  >
                    Ver
                  </a>
                )}
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
          {!filteredItems.length && (
            <tr>
              <td className="p-3 text-gray-500" colSpan={4}>
                No hay productos publicados para este tipo.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {open && (
        <StagedPublishModal
          item={open}
          onClose={() => setOpen(null)}
          onSaved={async () => {
            try {
              const { items } = await listAdminCatalog();
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
                          const { items } = await listAdminCatalog();
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
