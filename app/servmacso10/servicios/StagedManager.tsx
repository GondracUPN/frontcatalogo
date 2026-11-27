"use client";
import { accessorySku, isAccessory } from "@/lib/accessories";
import { accessoryUnitCost } from "@/lib/services-accessories";
import SaleQuantityField, { parseSaleQuantity, saleTotal } from "./SaleQuantityField";
import React from "react";
import SaleClientPhoto, { type ClientPhotoUpload } from "./SaleClientPhoto";
import IncludedStockAccessories, { initialStockSelection, isOtherUnitAccessoryConflict, isStockAccessoryConflict, stockSelectionPayload, type StockAccessorySelection } from "./IncludedStockAccessories";
import dynamic from "next/dynamic";
import { deleteStaged, listStaged, markStagedProductSold } from "../../actions";
import { dateInputInPeru } from "../../utils/peruTime";
import { DeleteIcon, PublishIcon, SellIcon } from "./ActionIcons";

const StagedPublishModal = dynamic(() => import("./PublishModal"), { ssr: false });

export default function StagedManager({ initialItems, sealedPresets = [], canDelete = true, search = "", onlyCategory }: { initialItems: any[]; sealedPresets?: any[]; canDelete?: boolean; search?: string; onlyCategory?: string }) {
  const [items, setItems] = React.useState<any[]>(initialItems || []);
  const [open, setOpen] = React.useState<null | any>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [soldModal, setSoldModal] = React.useState<null | {
    item: any;
    accesoriosStock?: StockAccessorySelection | null;
    date: string;
    price: string;
    quantity: string;
    exchangeRate: string;
    customerName: string;
    customerPhone: string;
    customerKind: "tranquilo" | "regateador";
    salePlaceType: "" | "almacen" | "otro";
    saleLocation: string;
    clientPhotoUrl?: string;
  }>(null);
  const [selling, setSelling] = React.useState(false);
  const clientPhotoUploadRef = React.useRef<ClientPhotoUpload | null>(null);
  const sellingRef = React.useRef(false);

  const displaySku = (value: unknown) => String(value || "").trim().replace(/^svc(?=[-_\s]*\d)/i, "MS");
  const timeOf = (it: any) => new Date(it?.created_at || it?.updated_at || 0).getTime() || 0;
  const matchesSearch = (value: unknown, term: string) => {
    const text = String(value || "").toLowerCase();
    return term.toLowerCase().split(/\s+/).filter(Boolean).every((part) => text.includes(part));
  };

  React.useEffect(() => {
    const refreshStaged = async () => {
      try {
        const res = await listStaged({ pageSize: "all" });
        setItems((Array.isArray(res?.items) ? res.items : []).filter((item: any) => !onlyCategory || item.category === onlyCategory));
      } catch {}
    };
    window.addEventListener("staged-products-updated", refreshStaged);
    return () => window.removeEventListener("staged-products-updated", refreshStaged);
  }, [onlyCategory]);

  const costoCompra = (it: any) => {
    try {
      const notes = it?.notes && typeof it.notes === "string" ? JSON.parse(it.notes) : (it?.notes || {});
      if (isAccessory(it)) {
        // Accesorios: costo UNITARIO (el total histórico del lote no se reescribe).
        const unit = accessoryUnitCost(notes);
        return unit === null ? "-" : `S/ ${unit.toFixed(2)}`;
      }
      const v = notes?.valor || notes?.specs?.valor || {};
      const c = Number(v?.costoTotal ?? v?.valorSoles ?? 0);
      if (!isFinite(c) || c <= 0) return "-";
      return `S/ ${c.toFixed(2)}`;
    } catch {
      return "-";
    }
  };

  const normalizeGroupTitle = (value: unknown) =>
    String(value || "Sin titulo")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}+/gu, "")
      .replace(/\s+/g, " ");

  const parseNotes = (it: any) => {
    try {
      return it?.notes && typeof it.notes === "string" ? JSON.parse(it.notes) : it?.notes || {};
    } catch {
      return {};
    }
  };

  const groupKeyFor = (it: any) => {
    const notes = parseNotes(it);
    const variantGroup = String(it?.variant_group || notes?.variantGroup || notes?.variant_group || "").trim();
    return variantGroup ? `variant:${variantGroup.toLowerCase()}` : `title:${normalizeGroupTitle(it?.title)}`;
  };

  const priceValue = (it: any) => {
    const n = Number(it?.price || 0);
    return Number.isFinite(n) ? n : 0;
  };

  const costValue = (it: any) => {
    const n = Number(costoCompra(it).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const formatRange = (values: number[], prefix = "") => {
    const clean = values.filter((v) => Number.isFinite(v) && v > 0);
    if (!clean.length) return "-";
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    if (Math.abs(min - max) < 0.001) return `${prefix}${min.toFixed(2)}`;
    return `${prefix}${min.toFixed(2)} - ${prefix}${max.toFixed(2)}`;
  };

  const groupedItems = (() => {
    const map = new Map<string, any[]>();
    const term = search.trim().toLowerCase();
    items
      .filter((it) => !term || (isAccessory(it) ? accessorySku(it) : displaySku(it?.sku)).toLowerCase().includes(term) || matchesSearch(it?.title, term))
      .forEach((it) => {
      const key = groupKeyFor(it);
      map.set(key, [...(map.get(key) || []), it]);
    });
    return Array.from(map.entries())
      .map(([key, rows]) => ({ key, rows: rows.slice().sort((a, b) => timeOf(b) - timeOf(a)) }))
      .sort((a, b) => timeOf(b.rows[0]) - timeOf(a.rows[0]));
  })();

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const deleteItem = async (it: any) => {
    if (!confirm("¿Eliminar este borrador del inventario?")) return;
    try {
      await deleteStaged(it.id);
      setItems((arr) => arr.filter((a) => a.id !== it.id));
      window.dispatchEvent(new Event("staged-products-updated"));
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo eliminar el borrador");
    }
  };

  const openForPublish = (it: any) => {
    setOpen({
      ...it,
      __sealedPresets: sealedPresets,
      __mergeStock: isAccessory(it) ? undefined : 1,
      __mergeStagedIds: [],
      __mergeInitialSkus: [],
      __mergeCandidates: items.filter((candidate) => String(candidate?.id || "") !== String(it?.id || "")),
    });
  };

  const renderItemRow = (it: any, nested = false) => (
    <tr key={it.id} className={`border-t ${nested ? "bg-white max-sm:ml-4" : ""}`}>
      <td className={`p-2 text-gray-900 font-medium ${nested ? "pl-6" : ""}`}>
        {it.title}
        {isAccessory(it) && <div className="text-xs font-normal text-gray-600">{Number(it.stock || 0)} disponibles</div>}
      </td>
      <td data-label="SKU" className="p-2 text-gray-900">{(isAccessory(it) ? accessorySku(it) : displaySku(it.sku))}</td>
      <td data-label="Costo compra" className="p-2 text-gray-900">{costoCompra(it)}</td>
      <td data-label="Precio" className="p-2 text-gray-900">{it.price}</td>
      <td data-label="Estado" className="p-2"><span className="px-2 py-1 rounded bg-gray-100 text-gray-900">{it.status}</span></td>
      <td className="p-2 flex flex-wrap gap-2">
        <button
          onClick={() => openForPublish(it)}
          className="rounded bg-emerald-600 p-2 text-white hover:bg-emerald-700"
          aria-label="Publicar producto"
          title="Publicar"
        >
          <PublishIcon />
        </button>
        <button
          onClick={() => setSoldModal({
            item: it,
            accesoriosStock: initialStockSelection(it),
            date: dateInputInPeru(),
            price: String(it?.price || 0),
            quantity: "1",
            exchangeRate: "",
            customerName: "",
            customerPhone: "",
            customerKind: "tranquilo",
            salePlaceType: "",
            saleLocation: "",
          })}
          className="rounded bg-amber-600 p-2 text-white hover:bg-amber-700"
          aria-label="Vender producto"
          title="Vender"
        >
          <SellIcon />
        </button>
        {canDelete && (
          <button
            onClick={() => deleteItem(it)}
            className="rounded bg-red-600 p-2 text-white hover:bg-red-700"
            aria-label="Eliminar producto"
            title="Eliminar"
          >
            <DeleteIcon />
          </button>
        )}
      </td>
    </tr>
  );

  return (
    <div className="overflow-auto">
      <table className="m-cards min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-700">
            <th className="p-2">Titulo</th>
            <th className="p-2">SKU</th>
            <th className="p-2">Costo compra</th>
            <th className="p-2">Precio</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {groupedItems.map(({ key, rows }) => {
            const first = rows[0];
            const isGrouped = rows.length > 1;
            const expanded = expandedGroups.has(key);
            if (!isGrouped) return renderItemRow(first, false);

            // Los accesorios muestran su código comercial (ACC-n), nunca el identificador de lote.
            const skus = Array.from(new Set(rows.map((it) => (isAccessory(it) ? accessorySku(it) : displaySku(it.sku))).filter(Boolean)));
            const statuses = Array.from(new Set(rows.map((it) => String(it.status || "").trim()).filter(Boolean))).join(", ");
            const accessoryStock = rows.every(isAccessory) ? rows.reduce((total, it) => total + Number(it.stock || 0), 0) : null;

            return (
              <React.Fragment key={key}>
                <tr className="border-t bg-gray-50/80">
                  <td className="p-2 text-gray-900 font-semibold">
                    {first.title}
                    <div className="mt-1 text-xs font-medium text-gray-500">
                      {accessoryStock == null ? `${rows.length} unidades agrupadas` : `${accessoryStock} disponibles`}
                    </div>
                  </td>
                  <td data-label="SKU" className="p-2 text-gray-900">
                    <div className="flex sm:min-w-40 flex-wrap gap-1">
                      {skus.length
                        ? skus.map((sku, index) => (
                            <span key={`${sku}-${index}`} className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                              {sku}
                            </span>
                          ))
                        : "-"}
                    </div>
                  </td>
                  <td data-label="Costo compra" className="p-2 text-gray-900">{formatRange(rows.map(costValue), "S/ ")}</td>
                  <td data-label="Precio" className="p-2 text-gray-900">{formatRange(rows.map(priceValue))}</td>
                  <td data-label="Estado" className="p-2"><span className="px-2 py-1 rounded bg-gray-100 text-gray-900">{statuses || "-"}</span></td>
                  <td className="p-2">
                    <button onClick={() => toggleGroup(key)} className="px-3 py-1 rounded bg-gray-900 text-white">
                      {expanded ? "Ocultar" : "Ver unidades"}
                    </button>
                  </td>
                </tr>
                {expanded && rows.map((it) => renderItemRow(it, true))}
              </React.Fragment>
            );
          })}
          {!groupedItems.length && (
            <tr><td className="p-3 text-gray-500" colSpan={6}>No se encontraron productos.</td></tr>
          )}
        </tbody>
      </table>

      {open && (
        <StagedPublishModal
          item={open}
          onClose={() => setOpen(null)}
          onSaved={(updated) => {
            const merged = new Set([String(updated.id), ...(Array.isArray(updated.__mergeStagedIds) ? updated.__mergeStagedIds.map(String) : [])]);
            setItems((arr) => arr.filter((a) => !merged.has(String(a.id))));
            setOpen(null);
            window.dispatchEvent(new Event("staged-products-updated"));
            window.dispatchEvent(new Event("catalog-products-updated"));
          }}
        />
      )}

      {soldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-3 sm:p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Vender desde inventario</h3>
                <p className="text-sm text-gray-600">{soldModal.item?.title} · {(isAccessory(soldModal.item || {}) ? accessorySku(soldModal.item) : displaySku(soldModal.item?.sku))}</p>
              </div>
              <button disabled={selling} onClick={() => setSoldModal(null)} aria-label="Cerrar" className="text-xl text-gray-500 disabled:opacity-40">×</button>
            </div>
            <label className="mb-1 block text-sm text-gray-700">Fecha de venta</label>
            <input type="date" value={soldModal.date} onChange={(e) => setSoldModal({ ...soldModal, date: e.target.value })} className="mb-3 w-full rounded border px-3 py-2" />
            <label className="mb-1 block text-sm text-gray-700">Precio de venta</label>
            <input type="number" min="0" step="0.01" value={soldModal.price} onChange={(e) => setSoldModal({ ...soldModal, price: e.target.value })} className="mb-3 w-full rounded border px-3 py-2" />
            <label className="mb-1 block text-sm text-gray-700">Tipo de cambio (opcional)</label>
            <input type="number" min="0.0001" step="0.0001" value={soldModal.exchangeRate} onChange={(e) => setSoldModal({ ...soldModal, exchangeRate: e.target.value })} className="mb-3 w-full rounded border px-3 py-2" placeholder="Puedes completarlo luego en Servicios" />
            <label className="mb-1 block text-sm text-gray-700">Nombre del cliente</label>
            <input value={soldModal.customerName} onChange={(e) => setSoldModal({ ...soldModal, customerName: e.target.value })} className="mb-3 w-full rounded border px-3 py-2" placeholder="Nombre y apellido" />
            <label className="mb-1 block text-sm text-gray-700">Número o usuario de WhatsApp</label>
            <input value={soldModal.customerPhone} onChange={(e) => setSoldModal({ ...soldModal, customerPhone: e.target.value })} className="mb-3 w-full rounded border px-3 py-2" placeholder="999 999 999 o @usuario" autoCapitalize="none" />
            <label className="mb-1 block text-sm text-gray-700">Tipo de cliente</label>
            <select value={soldModal.customerKind} onChange={(e) => setSoldModal({ ...soldModal, customerKind: e.target.value as any })} className="mb-3 w-full rounded border px-3 py-2">
              <option value="tranquilo">Tranquilo</option>
              <option value="regateador">Regateador</option>
            </select>
            <label className="mb-1 block text-sm text-gray-700">Lugar de venta</label>
            <select value={soldModal.salePlaceType} onChange={(e) => setSoldModal({ ...soldModal, salePlaceType: e.target.value as any, saleLocation: e.target.value === "almacen" ? "" : soldModal.saleLocation })} className="mb-3 w-full rounded border px-3 py-2">
              <option value="">Seleccionar</option>
              <option value="almacen">Almacen</option>
              <option value="otro">Otro lugar</option>
            </select>
            {soldModal.salePlaceType === "otro" && (
              <>
                <label className="mb-1 block text-sm text-gray-700">Ubicacion de la venta</label>
                <input value={soldModal.saleLocation} onChange={(e) => setSoldModal({ ...soldModal, saleLocation: e.target.value })} className="mb-4 w-full rounded border px-3 py-2" placeholder="Ej: Miraflores, Jockey Plaza..." />
              </>
            )}
            {isAccessory(soldModal.item || {}) && (
              <SaleQuantityField
                disabled={selling}
                quantity={soldModal.quantity}
                stock={Number(soldModal.item?.stock)}
                unitPrice={soldModal.price}
                total={saleTotal(soldModal.item, soldModal.price, parseSaleQuantity(soldModal.quantity, Number(soldModal.item?.stock)) ?? 0)}
                onChange={(quantity) => setSoldModal({ ...soldModal, quantity })}
              />
            )}
            <IncludedStockAccessories disabled={selling} value={soldModal.accesoriosStock} onChange={(accesoriosStock) => setSoldModal({ ...soldModal, accesoriosStock })} />
            <SaleClientPhoto disabled={selling} onChange={(upload) => { clientPhotoUploadRef.current = upload; }} />
            <div className="flex justify-end gap-2">
              <button disabled={selling} onClick={() => setSoldModal(null)} className="rounded border px-3 py-1 disabled:opacity-50">Cancelar</button>
              <button
                disabled={selling}
                className="rounded bg-amber-600 px-3 py-1 text-white disabled:cursor-wait disabled:opacity-60"
                onClick={async () => {
                  if (sellingRef.current) return;
                  if (!soldModal.date || !soldModal.price || Number(soldModal.price) < 0) {
                    alert("Completa la fecha y el precio de venta");
                    return;
                  }
                  const looseAccessory = isAccessory(soldModal.item || {});
                  const quantity = looseAccessory ? parseSaleQuantity(soldModal.quantity, Number(soldModal.item?.stock)) : 1;
                  if (quantity === null) {
                    alert("Indica una cantidad entera entre 1 y el stock disponible");
                    return;
                  }
                  if (!soldModal.customerName.trim() || !soldModal.customerPhone.trim()) {
                    alert("Completa el nombre y el número o usuario de WhatsApp del cliente");
                    return;
                  }
                  // La foto se sube una sola vez: los reintentos reutilizan la URL.
                  const uploadedPhotoUrl = async () => {
                    if (soldModal.clientPhotoUrl || !clientPhotoUploadRef.current) return soldModal.clientPhotoUrl || undefined;
                    const url = await clientPhotoUploadRef.current();
                    if (url) setSoldModal((m) => m ? { ...m, clientPhotoUrl: url } : m);
                    return url;
                  };
                  sellingRef.current = true;
                  setSelling(true);
                  try {
                    const result = await markStagedProductSold(soldModal.item.id, soldModal.date, looseAccessory ? saleTotal(soldModal.item, soldModal.price, quantity) : soldModal.price, {
                      name: soldModal.customerName,
                      phone: soldModal.customerPhone,
                      customerKind: soldModal.customerKind,
                      salePlaceType: soldModal.salePlaceType,
                      saleLocation: soldModal.salePlaceType === "otro" ? soldModal.saleLocation : "",
                      exchangeRate: soldModal.exchangeRate || undefined,
                      clientPhotoUrl: await uploadedPhotoUrl(),
                      ...stockSelectionPayload(soldModal.accesoriosStock),
                      ...(looseAccessory ? { cantidad: quantity } : {}),
                    });
                    if (!result.ok && isOtherUnitAccessoryConflict(result.error)) {
                      // Otra unidad del grupo con accesorios distintos: se cierra el modal y se recarga, sin reintento.
                      alert(result.error);
                      setSoldModal(null);
                      try {
                        const res = await listStaged({ pageSize: "all" });
                        setItems(Array.isArray(res?.items) ? res.items : []);
                      } catch {}
                      return;
                    }
                    if (!result.ok && isStockAccessoryConflict(result.error)) {
                      // Recarga la unidad para mostrar los accesorios vigentes sin perder lo ya escrito.
                      try {
                        const res = await listStaged({ pageSize: "all" });
                        const fresh = Array.isArray(res?.items) ? res.items : [];
                        setItems(fresh);
                        const freshUnit = fresh.find((u: any) => String(u?.id) === String(soldModal.item?.id));
                        setSoldModal((m) => m ? { ...m, accesoriosStock: freshUnit ? initialStockSelection(freshUnit) : m.accesoriosStock } : m);
                      } catch {}
                      alert(`${result.error} Revisa los accesorios marcados y pulsa Registrar venta otra vez.`);
                      return;
                    }
                    if (!result.ok) throw new Error(result.error || "No se pudo registrar la venta");
                    const res = await listStaged({ pageSize: "all" });
                    setItems(Array.isArray(res?.items) ? res.items : []);
                    window.dispatchEvent(new Event("staged-products-updated"));
                    window.dispatchEvent(new Event("sales-updated"));
                    setSoldModal(null);
                  } catch (error) {
                    alert(error instanceof Error ? error.message : "No se pudo registrar la venta");
                  } finally {
                    sellingRef.current = false;
                    setSelling(false);
                  }
                }}
              >
                {selling ? "Registrando..." : "Registrar venta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
