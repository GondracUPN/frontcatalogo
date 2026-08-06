"use client";
import React from "react";
import dynamic from "next/dynamic";
import { listAdminCatalog, listStaged, markProductSold, unpublishProduct } from "../../actions";
import { dateInputInPeru, formatPeruDate, hasMeaningfulPeruUpdate } from "../../utils/peruTime";
import { DeleteIcon, SellIcon } from "./ActionIcons";

const StagedPublishModal = dynamic(() => import("./PublishModal"), { ssr: false });

type CatalogRow = {
  id: string;
  product_id?: string | null;
  slug?: string | null;
  category?: string | null;
  is_published?: boolean;
  created_at?: string;
  updated_at?: string;
  images?: string[];
  product?: { id: string; sku: string; title: string; price: string; stock?: number; status?: string; variant_group?: string | null; product_condition?: string | null };
  staged?: any;
  linkedStaged?: any[];
};

type SortMode = "upload" | "sku";
type CatalogDisplayRow =
  | { kind: "group"; key: string; rows: CatalogRow[]; unitCount: number }
  | { kind: "product"; row: CatalogRow; nested: boolean };

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

function parseNotes(value: any) {
  try {
    return value && typeof value === "string" ? JSON.parse(value) : value || {};
  } catch {
    return {};
  }
}

function saleTypeOf(value: any) {
  const notes = parseNotes(value?.notes);
  return String(value?.sale_type || notes?.saleType || "").toUpperCase();
}

function conditionOf(row: CatalogRow) {
  const notes = parseNotes(row.staged?.notes);
  return String(row.product?.product_condition || row.staged?.product_condition || notes?.productCondition || notes?.estado || "").trim();
}

function conditionLabel(value: unknown) {
  const condition = String(value || "").trim();
  if (/^nuevo$/i.test(condition)) return "Sellado";
  if (/usad/i.test(condition)) return "Usado";
  return condition || "Sin estado";
}

function groupConditionSummary(rows: CatalogRow[]) {
  const count = (pattern: RegExp) => rows
    .filter((row) => pattern.test(conditionOf(row)))
    .reduce((sum, row) => sum + Math.max(1, Number(row.product?.stock || 0)), 0);
  const sealed = count(/^nuevo$/i);
  const used = count(/usad/i);
  const openBox = count(/open box/i);
  return [
    sealed ? `${sealed} sellado${sealed === 1 ? "" : "s"}` : "",
    used ? `${used} usado${used === 1 ? "" : "s"}` : "",
    openBox ? `${openBox} open box` : "",
  ].filter(Boolean).join(" · ");
}

function linkedSkuRowsFor(row: CatalogRow) {
  if (Array.isArray(row.linkedStaged)) return row.linkedStaged;
  const staged = row.staged || {};
  const notes = parseNotes(staged?.notes);
  const skus = Array.isArray(notes?.linkedSkus) ? notes.linkedSkus : [];
  return skus.map((sku: unknown) => ({ sku: String(sku || "").trim() })).filter((linked: any) => linked.sku);
}

function catalogRowPrices(row: CatalogRow) {
  const fallback = Number(row.product?.price || row.staged?.price || 0);
  const values = [
    fallback,
    ...linkedSkuRowsFor(row).map((linked: any) => Number(linked?.price ?? fallback)),
  ];
  return values.filter((price) => Number.isFinite(price) && price > 0);
}

function unitDetails(value: any) {
  const notes = parseNotes(value?.notes);
  return [
    value?.color || notes?.color ? `Color: ${value?.color || notes?.color}` : "",
    value?.includes || notes?.includes ? `Incluye: ${value?.includes || notes?.includes}` : "",
    value?.keyboard_layout || notes?.keyboardLayout ? `Teclado: ${value?.keyboard_layout || notes?.keyboardLayout}` : "",
    value?.battery_health || notes?.batteryHealth || notes?.bateria?.salud
      ? `Batería: ${value?.battery_health || notes?.batteryHealth || notes?.bateria?.salud}%`
      : "",
  ].filter(Boolean).join(" · ");
}

function displaySku(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const preventaLegacy = raw.match(/^prev[-_\s]*svc[-_\s]*(\d+)$/i);
  if (preventaLegacy) return `PREV-MS-${preventaLegacy[1]}`;
  const legacy = raw.match(/^svc[-_\s]*(\d+)$/i);
  if (legacy) return `MS-${legacy[1]}`;
  return raw;
}

function matchesSearch(value: unknown, search: string) {
  const text = String(value || "").toLowerCase();
  return search.toLowerCase().split(/\s+/).filter(Boolean).every((term) => text.includes(term));
}

function skuSortValue(row: CatalogRow) {
  return displaySku(row.product?.sku || row.staged?.sku).toUpperCase();
}

function skuSortParts(value: string) {
  const match = value.match(/(\d+)(?!.*\d)/);
  return {
    number: match ? Number(match[1]) : Number.POSITIVE_INFINITY,
    raw: value,
  };
}

function compareSkuRows(a: CatalogRow, b: CatalogRow) {
  const left = skuSortParts(skuSortValue(a));
  const right = skuSortParts(skuSortValue(b));
  if (left.number !== right.number) return left.number - right.number;
  return left.raw.localeCompare(right.raw);
}

export default function CatalogManager({ initialItems, inventoryItems = [], canDelete = true }: { initialItems: CatalogRow[]; inventoryItems?: any[]; canDelete?: boolean }) {
  const [items, setItems] = React.useState<CatalogRow[]>(initialItems || []);
  const [inventoryRows, setInventoryRows] = React.useState<any[]>(inventoryItems || []);
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [sortMode, setSortMode] = React.useState<SortMode>("upload");
  const [search, setSearch] = React.useState("");
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [open, setOpen] = React.useState<any | null>(null);
  const [soldModal, setSoldModal] = React.useState<{
    row: CatalogRow;
    unit?: any;
    date: string;
    price: string;
    customerName: string;
    customerPhone: string;
    customerKind: "tranquilo" | "regateador";
    salePlaceType: "" | "almacen" | "otro";
    saleLocation: string;
  } | null>(null);

  const refreshCatalog = React.useCallback(async () => {
    try {
      const { items } = await listAdminCatalog();
      setItems(items as any);
    } catch {}
  }, []);

  React.useEffect(() => {
    window.addEventListener("catalog-products-updated", refreshCatalog);
    return () => window.removeEventListener("catalog-products-updated", refreshCatalog);
  }, [refreshCatalog]);

  React.useEffect(() => {
    const refreshInventory = async () => {
      try {
        const res = await listStaged({ pageSize: "all" });
        setInventoryRows(Array.isArray(res?.items) ? res.items : []);
      } catch {}
    };
    window.addEventListener("staged-products-updated", refreshInventory);
    return () => window.removeEventListener("staged-products-updated", refreshInventory);
  }, []);

  const toStagedShape = (row: CatalogRow) => {
    const linkedRows = linkedSkuRowsFor(row);
    const linkedIds = linkedRows.map((linked: any) => String(linked?.id || "").trim()).filter(Boolean);
    const linkedSkus = linkedRows.map((linked: any) => String(linked?.sku || "").trim()).filter(Boolean);
    const currentSaleType = saleTypeOf(row.staged) || String((row.product as any)?.sale_type || "").toUpperCase();
    const replacementCandidates = currentSaleType === "PREVENTA"
      ? inventoryRows
          .filter((candidate: any) => !["published", "sold"].includes(String(candidate?.status || "").toLowerCase()))
          .filter((candidate: any) => String(candidate?.id || "") !== String(row.staged?.id || ""))
      : [];
    const productStock = Number(row.product?.stock);
    const hasProductStock = Number.isFinite(productStock);
    const fallbackStock = Math.max(1, Number(row.staged?.stock || 0) || linkedRows.length + 1);
    const currentStock = hasProductStock ? Math.max(0, productStock) : fallbackStock;
    const base = row.staged
      ? { ...row.staged }
      : {
          id: undefined as any,
          title: row.product?.title || "",
          price: row.product?.price || "0",
          stock: currentStock,
          images: row.images || [],
          notes: row.staged?.notes || null,
          sku: row.product?.sku || "",
          status: "published",
          variant_group: row.product?.variant_group || row.staged?.variant_group || "",
        };
    base.stock = currentStock;
    base.__mergeStock = base.stock;
    base.__mergeCandidates = linkedRows;
    base.__mergeStagedIds = linkedIds;
    base.__mergeInitialSkus = linkedSkus;
    base.__catalogProductId = row.product_id || row.product?.id || "";
    base.__catalogSlug = row.slug || "";
    base.__isPublishedPreventa = currentSaleType === "PREVENTA";
    base.__replacementCandidates = replacementCandidates;
    base.__sealedPresets = [...inventoryRows, ...items.map((catalogRow) => catalogRow.staged).filter(Boolean)];
    const baseNotes = (() => {
      try {
        return base?.notes && typeof base.notes === "string" ? JSON.parse(base.notes) : base?.notes || {};
      } catch {
        return {};
      }
    })();
    const noteSkus = Array.isArray(baseNotes?.linkedSkus)
      ? baseNotes.linkedSkus.map((sku: unknown) => String(sku || "").trim()).filter(Boolean)
      : [];
    if (!base.__mergeInitialSkus.length && noteSkus.length) {
      base.__mergeInitialSkus = noteSkus;
      if (!hasProductStock) {
        base.__mergeStock = Math.max(Number(base.__mergeStock || 1), noteSkus.length + 1);
        base.stock = Math.max(Number(base.stock || 1), noteSkus.length + 1);
      }
    }
    if (!base.variant_group) base.variant_group = row.product?.variant_group || row.staged?.variant_group || "";
    if ((!base.images || base.images.length === 0) && Array.isArray(row.images)) base.images = row.images;
    return base;
  };

  const rowCategory = (row: CatalogRow) => {
    const staged = row.staged || {};
    const notes = parseNotes(staged?.notes);
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

  const filteredItems = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = items
      .filter((row) => categoryFilter === "all" || rowCategory(row) === categoryFilter)
      .filter((row) => {
        if (!term) return true;
        const mainSku = displaySku(row.product?.sku || row.staged?.sku).toLowerCase();
        const title = String(row.product?.title || row.staged?.title || row.slug || "");
        return matchesSearch(title, term) || mainSku.includes(term) || linkedSkuRowsFor(row).some((linked: any) =>
          displaySku(linked?.sku).toLowerCase().includes(term) || matchesSearch(linked?.title, term)
        );
      });
    if (sortMode === "sku") return rows.slice().sort(compareSkuRows);
    return rows;
  }, [categoryFilter, items, search, sortMode]);

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
      `Estado: ${conditionLabel(conditionOf(row))}`,
      product.sku || staged.sku ? `SKU: ${displaySku(product.sku || staged.sku)}` : "",
      product.title || staged.title ? "" : "",
      product.stock ? `Stock: ${product.stock}` : "",
      product.status === "sold" ? "Vendido" : "",
      staged.color || notes?.color ? `Color: ${staged.color || notes?.color}` : "",
      staged.battery_health || notes?.batteryHealth ? `Bateria: ${staged.battery_health || notes?.batteryHealth}%` : "",
      staged.includes || notes?.includes ? `Incluye: ${staged.includes || notes?.includes}` : "",
    ].filter(Boolean).join(" · ");
  };

  const catalogDisplayRows = React.useMemo<CatalogDisplayRow[]>(() => {
    const groups = new Map<string, CatalogRow[]>();
    filteredItems.forEach((row) => {
      const title = String(row.product?.title || row.staged?.title || row.slug || "Producto").trim();
      const group = title.toLowerCase();
      const key = group || `row:${row.id}`;
      groups.set(key, [...(groups.get(key) || []), row]);
    });
    return Array.from(groups.entries()).flatMap(([key, rows]) => {
      const unitCount = rows.reduce((total, row) => total + Math.max(1, Number(row.product?.stock || 0), linkedSkuRowsFor(row).length + 1), 0);
      const shouldGroup = rows.length > 1 || rows.some((row) => linkedSkuRowsFor(row).length > 0);
      if (!shouldGroup) return [{ kind: "product" as const, row: rows[0], nested: false }];
      const summary: CatalogDisplayRow = { kind: "group", key, rows, unitCount };
      return expandedGroups.has(key)
        ? [summary, ...rows.map((row) => ({ kind: "product" as const, row, nested: true }))]
        : [summary];
    });
  }, [expandedGroups, filteredItems]);

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="overflow-auto">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div>
            <label className="block text-sm font-medium text-gray-700">Buscar por SKU o título</label>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ej. MS-266, MacBook Pro, M5 o 13" className="mt-1 w-full min-w-[260px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Filtrar por tipo</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mt-1 w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Orden</label>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="mt-1 w-full min-w-[180px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="upload">Subida</option>
              <option value="sku">SKU</option>
            </select>
          </div>
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
            <th className="p-2">Fechas</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {catalogDisplayRows.map((entry) => {
            if (entry.kind === "group") {
              const first = entry.rows[0];
              const expanded = expandedGroups.has(entry.key);
              const groupPrices = entry.rows.flatMap(catalogRowPrices);
              const groupMinPrice = groupPrices.length ? Math.min(...groupPrices) : 0;
              return (
                <tr key={`group-${entry.key}`} className="border-t bg-gray-50/80">
                  <td className="p-2 font-semibold text-gray-900">
                    {first.product?.title || first.staged?.title || first.slug}
                    <div className="mt-1 text-xs font-medium text-gray-500">
                      {entry.unitCount} unidades · {entry.rows.reduce((total, row) => total + linkedSkuRowsFor(row).length + 1, 0)} SKU
                      {groupConditionSummary(entry.rows) ? ` · ${groupConditionSummary(entry.rows)}` : ""}
                    </div>
                  </td>
                  <td className="p-2 text-xs text-gray-600">
                    {entry.rows.map((row) => displaySku(row.product?.sku || row.staged?.sku)).filter(Boolean).join(", ") || "-"}
                  </td>
                  <td className="p-2 text-gray-900">
                    Desde S/ {groupMinPrice.toFixed(2)}
                  </td>
                  <td className="p-2 text-xs text-gray-500">Grupo automático</td>
                  <td className="p-2">
                    <button onClick={() => toggleGroup(entry.key)} className="rounded bg-gray-900 px-3 py-1 text-white">
                      {expanded ? "Ocultar equipos" : "Ver equipos"}
                    </button>
                  </td>
                </tr>
              );
            }
            const row = entry.row;
            const linkedRows = linkedSkuRowsFor(row);
            const showUpdated = hasMeaningfulPeruUpdate(row.created_at, row.updated_at);
            return (
              <React.Fragment key={row.id}>
                <tr className={`border-t ${entry.nested ? "bg-gray-200" : ""}`}>
                  <td className="p-2 text-gray-900 font-medium">
                    <div>{row.product?.title || row.staged?.title || row.slug}</div>
                    {variantLabel(row) && <div className="mt-1 text-xs font-normal text-gray-500">{variantLabel(row)}</div>}
                  </td>
                  <td className="p-2 text-gray-900">
                    <div>{displaySku(row.product?.sku || row.staged?.sku) || "-"}</div>
                    {linkedRows.length > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        +{linkedRows.length} unidad{linkedRows.length === 1 ? "" : "es"} del mismo stock
                      </div>
                    )}
                  </td>
                  <td className="p-2 text-gray-900">S/ {Number(row.product?.price || 0).toFixed(2)}</td>
                  <td className="p-2 text-xs leading-5 text-gray-600">
                    <div>Subida: {formatPeruDate(row.created_at)}</div>
                    {showUpdated && <div>Actualizada: {formatPeruDate(row.updated_at)}</div>}
                  </td>
                  <td className="p-2">
                <div className="flex w-fit flex-col gap-2">
                  <div className="flex gap-2">
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
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSoldModal({
                        row,
                        date: dateInputInPeru(),
                        price: String(row.product?.price || 0),
                        customerName: "",
                        customerPhone: "",
                        customerKind: "tranquilo",
                        salePlaceType: "",
                        saleLocation: "",
                      })}
                      className="rounded bg-amber-600 p-2 text-white hover:bg-amber-700"
                      aria-label="Marcar producto como vendido"
                      title="Vendido"
                    >
                      <SellIcon />
                    </button>
                    {canDelete && <button
                      onClick={async () => {
                        try {
                          await unpublishProduct(row.product?.id || row.id);
                          setItems((arr) => arr.filter((r) => r.id !== row.id));
                        } catch {
                          alert("No se pudo despublicar");
                        }
                      }}
                      className="rounded bg-red-600 p-2 text-white hover:bg-red-700"
                      aria-label="Eliminar producto del catalogo"
                      title="Eliminar"
                    >
                      <DeleteIcon />
                    </button>}
                  </div>
                </div>
                  </td>
                </tr>
                {linkedRows.map((linked: any) => (
                  <tr key={`linked-${row.id}-${linked.id || linked.sku}`} className="border-t bg-gray-300">
                    <td className="p-2 pl-6 text-gray-900">
                      <div className="text-sm font-medium">{linked.title || row.product?.title || row.staged?.title || row.slug}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {unitDetails(linked) || "Misma variante"}
                      </div>
                    </td>
                    <td className="p-2 font-mono text-xs text-gray-900">{displaySku(linked.sku) || "-"}</td>
                    <td className="p-2 text-gray-900">S/ {Number(linked.price || row.product?.price || 0).toFixed(2)}</td>
                    <td className="p-2 text-xs leading-5 text-gray-600">
                      <div>Subida: {formatPeruDate(linked.created_at)}</div>
                      {hasMeaningfulPeruUpdate(linked.created_at, linked.updated_at) && <div>Actualizada: {formatPeruDate(linked.updated_at)}</div>}
                    </td>
                    <td className="p-2">
                      <button
                        onClick={() => setSoldModal({
                          row,
                          unit: linked,
                          date: dateInputInPeru(),
                          price: String(linked.price || row.product?.price || 0),
                          customerName: "",
                          customerPhone: "",
                          customerKind: "tranquilo",
                          salePlaceType: "",
                          saleLocation: "",
                        })}
                        className="rounded bg-amber-600 p-2 text-white hover:bg-amber-700"
                        aria-label={`Marcar ${displaySku(linked.sku)} como vendido`}
                        title={`Vender ${displaySku(linked.sku)}`}
                      >
                        <SellIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
          {!filteredItems.length && (
            <tr>
              <td className="p-3 text-gray-500" colSpan={5}>
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
          onSaved={async (updated: any) => {
            if (updated?.__replacedPreventa) {
              await refreshCatalog();
            } else {
              await refreshCatalog();
            }
            window.dispatchEvent(new Event("staged-products-updated"));
            setOpen(null);
          }}
        />
      )}

      {soldModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 text-gray-900">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold">Marcar como vendido</h3>
                {soldModal.unit?.sku && (
                  <p className="text-sm text-gray-600">Unidad exacta: {displaySku(soldModal.unit.sku)}</p>
                )}
              </div>
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
              className="w-full border rounded px-3 py-2 mb-3"
            />
            <label className="block text-sm text-gray-700 mb-1">Nombre del cliente</label>
            <input
              value={soldModal.customerName}
              onChange={(e) => setSoldModal({ ...soldModal, customerName: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3"
              placeholder="Nombre"
            />
            <label className="block text-sm text-gray-700 mb-1">Numero del cliente</label>
            <input
              value={soldModal.customerPhone}
              onChange={(e) => setSoldModal({ ...soldModal, customerPhone: e.target.value })}
              className="w-full border rounded px-3 py-2 mb-3"
              placeholder="Celular"
            />
            <label className="block text-sm text-gray-700 mb-1">Tipo de cliente</label>
            <select
              value={soldModal.customerKind}
              onChange={(e) => setSoldModal({ ...soldModal, customerKind: e.target.value as any })}
              className="w-full border rounded px-3 py-2 mb-3 bg-white"
            >
              <option value="tranquilo">Tranquilo</option>
              <option value="regateador">Regateador</option>
            </select>
            <label className="block text-sm text-gray-700 mb-1">Lugar de venta</label>
            <select
              value={soldModal.salePlaceType}
              onChange={(e) => setSoldModal({ ...soldModal, salePlaceType: e.target.value as any, saleLocation: e.target.value === "almacen" ? "" : soldModal.saleLocation })}
              className="w-full border rounded px-3 py-2 mb-3 bg-white"
            >
              <option value="">-</option>
              <option value="almacen">Almacen</option>
              <option value="otro">Otro lado</option>
            </select>
            {soldModal.salePlaceType === "otro" && (
              <>
                <label className="block text-sm text-gray-700 mb-1">Ubicacion de la venta</label>
                <input
                  value={soldModal.saleLocation}
                  onChange={(e) => setSoldModal({ ...soldModal, saleLocation: e.target.value })}
                  className="w-full border rounded px-3 py-2 mb-4"
                  placeholder="Ej: Miraflores, Jockey Plaza..."
                />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setSoldModal(null)} className="px-3 py-1 rounded border">
                Cancelar
              </button>
                <button
                  className="px-3 py-1 rounded bg-amber-600 text-white"
                  onClick={async () => {
                    try {
                      const pid = soldModal.row.product?.id || soldModal.row.id;
                      await markProductSold(pid, soldModal.date, soldModal.price, {
                        name: soldModal.customerName,
                        phone: soldModal.customerPhone,
                        customerKind: soldModal.customerKind,
                        salePlaceType: soldModal.salePlaceType,
                        saleLocation: soldModal.salePlaceType === "otro" ? soldModal.saleLocation : "",
                        stagedId: soldModal.unit?.id || undefined,
                      });
                      try {
                        const { items } = await listAdminCatalog();
                        setItems(items as any);
                      } catch {}
                      window.dispatchEvent(new Event("sales-updated"));
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

    </div>
  );
}
