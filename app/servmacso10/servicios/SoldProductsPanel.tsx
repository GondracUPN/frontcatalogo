"use client";
import React from "react";
import { sellersAction } from "../analisis/actions";
import type { SellerRow } from "../analisis/sales-types";
import { listSales, retrySaleSync, unsellProduct, updateSale, manageSoldPhotos, planSoldPhotos } from "../../actions";
import { dateInputInPeru, formatPeruDate } from "../../utils/peruTime";
import SaleClientPhotoEditor from "./SaleClientPhotoEditor";

type Sale = {
  id: string;
  product_id: string;
  sku?: string;
  sale_price?: string | number;
  sold_at?: string;
  title?: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  client_photo_url?: string | null;
  client_photo_public?: boolean | null;
  product_image_url?: string | null;
  customer_kind?: string | null;
  sale_place_type?: string | null;
  sale_location?: string | null;
  exchange_rate?: string | number | null;
  sync_status?: string | null;
  sync_remote_status?: string | null;
  sync_error?: string | null;
  sync_event_id?: string | null;
  photo_count?: number;
  photos_product_id?: string;
  photos_cleanup_at?: string | null;
  photos_hold?: boolean;
  photos_hold_reason?: string | null;
  presentation?: string | null;
};

function formatDate(value: unknown) {
  return formatPeruDate(value);
}

function inputDate(value: unknown) {
  return value ? dateInputInPeru(value) : "";
}

function phone(value: unknown) {
  return String(value || "").replace(/\D+/g, "") || "-";
}

function displaySku(value: unknown) {
  return String(value || "").trim().replace(/^svc(?=[-_\s]*\d)/i, "MS");
}

function salePlace(sale: Sale) {
  const type = String(sale.sale_place_type || "").trim();
  const location = String(sale.sale_location || "").trim();
  if (type === "otro") return location || "-";
  if (type === "almacen") return "Almacen";
  return "-";
}

// Todos los botones de acción con el mismo tamaño compacto.
const BTN = "inline-flex h-8 items-center justify-center rounded-lg border bg-white px-2.5 text-xs font-medium transition active:scale-[0.97]";

// Miniatura de tamaño fijo para que todas las filas midan lo mismo.
function Thumb({ src, alt, round = false, dim = false, title }: { src?: string | null; alt: string; round?: boolean; dim?: boolean; title?: string }) {
  const shape = round ? "rounded-full" : "rounded-lg";
  if (!src) return <span aria-hidden="true" className={`h-10 w-10 shrink-0 bg-gray-100 ${shape}`} />;
  return <img src={src} alt={alt} title={title} className={`h-10 w-10 shrink-0 bg-gray-50 object-cover ${shape} ${dim ? "opacity-40" : ""}`} />;
}

export default function SoldProductsPanel({ initialSales, isAdmin = false, initialOwner }: { initialSales: Sale[]; isAdmin?: boolean; initialOwner?: string }) {
  const [owner, setOwner] = React.useState(initialOwner || "macsomenos");
  const [sellers, setSellers] = React.useState<SellerRow[]>([]);
  React.useEffect(()=>{if(!isAdmin)return;let active=true;const to=new Date(),from=new Date(to.getTime()-30*86400000);sellersAction(from.toISOString(),to.toISOString()).then(result=>{if(active&&result.ok)setSellers(result.data.items);});return()=>{active=false;};},[isAdmin]);
  const [sales, setSales] = React.useState<Sale[]>(initialSales || []);
  const [loading, setLoading] = React.useState((initialSales || []).length === 0);
  const [open, setOpen] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Sale | null>(null);
  const [photoSale, setPhotoSale] = React.useState<Sale | null>(null);
  const [editForm, setEditForm] = React.useState({
    saleDate: "",
    salePrice: "",
  });

  const refresh = React.useCallback(async () => {
    try {
      const res = await listSales(isAdmin ? owner : undefined);
      setSales(Array.isArray(res?.items) ? (res.items as Sale[]) : []);
    } finally {
      setLoading(false);
    }
  }, [owner,isAdmin]);

  React.useEffect(() => {
    refresh().catch(() => {});
    const timer = window.setInterval(() => refresh().catch(() => {}), 5000);
    const onSalesUpdated = () => {
      refresh().catch(() => {});
    };
    window.addEventListener("sales-updated", onSalesUpdated);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("sales-updated", onSalesUpdated);
    };
  }, [refresh]);

  const restoreSale = async (sale: Sale) => {
    if (!confirm("¿Cancelar esta venta? El producto volverá a estar disponible y la anulación se enviará a Servicios para una segunda confirmación.")) return;
    setBusyId(sale.id);
    try {
      const result = await unsellProduct(sale.product_id, sale.id);
      if (!result.ok) throw new Error(result.error || "No se pudo cancelar la venta");
      await refresh();
      window.dispatchEvent(new Event("sales-updated"));
      window.dispatchEvent(new Event("catalog-products-updated"));
      window.dispatchEvent(new Event("staged-products-updated"));
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo cancelar la venta");
    } finally {
      setBusyId(null);
    }
  };

  const retrySync = async (sale: Sale) => {
    if (!sale.sync_event_id || busyId) return;
    setBusyId(sale.id);
    try {
      const result = await retrySaleSync(sale.sync_event_id);
      if (!result.ok) {
        throw new Error(result.error || `No se pudo reenviar (${result.status || "error"})`);
      }
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "No se pudo reenviar la venta a Servicios");
    } finally {
      setBusyId(null);
    }
  };

  const syncLabel = (sale: Sale) => {
    if (!sale.sync_event_id) return "Venta anterior";
    if (sale.sync_remote_status === "rejected") return "Venta rechazada";
    if (sale.sync_remote_status === "confirmed") return "Venta confirmada";
    if (sale.sync_remote_status === "cancelled") return "Anulación confirmada";
    if (sale.sync_remote_status === "pending_cancellation_confirmation") return "Anulación pendiente en Servicios";
    if (sale.sync_status === "sent") return "Pendiente en Servicios";
    if (sale.sync_status === "failed") return "Error de envío";
    if (sale.sync_status === "configuration_required") return "Falta configurar";
    return sale.sync_status || "Pendiente";
  };

  const canRetrySync = (sale: Sale) => Boolean(
    sale.sync_event_id && (
      ["failed", "configuration_required"].includes(String(sale.sync_status)) ||
      sale.sync_remote_status === "rejected"
    )
  );

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
      window.dispatchEvent(new Event("sales-updated"));
      if (result?.sync && !result.sync.ok) {
        alert(`Venta guardada, pero Servicios no se actualizó: ${result.sync.error || result.sync.status || "error desconocido"}`);
      }
    } catch {
      alert("No se pudo actualizar la venta");
    } finally {
      setBusyId(null);
    }
  };

  const recentSales = sales.slice(0, 10);

  const photoAction = async (sale: Sale, action: "cleanup" | "hold") => {
    if (busyId) return;
    let reason = "";
    if (action === "hold" && !sale.photos_hold) {
      const value = prompt("Motivo de la reclamación:");
      if (!value?.trim()) return;
      reason = value.trim();
    }
    setBusyId(sale.id);
    try {
      if (action === "cleanup") {
        const plan = await planSoldPhotos(sale.photos_product_id || sale.product_id);
        if (!confirm(`¿Borrar ${plan.secondaryCount} fotos secundarias? La portada se conserva siempre.`)) return;
      }
      await manageSoldPhotos(sale.photos_product_id || sale.product_id, action, { hold: !sale.photos_hold, reason });
      await refresh();
    } catch (e) { alert(e instanceof Error ? e.message : "No se pudieron actualizar las fotos"); }
    finally { setBusyId(null); }
  };
  // Solo en la lista completa: en las ventas recientes aún no hace falta.
  const photoControls = (sale: Sale) => <div className="w-32 text-xs text-gray-600">
    <p className="truncate" title={sale.photos_hold_reason || (sale.photos_cleanup_at ? `Las fotos secundarias se limpian el ${formatDate(sale.photos_cleanup_at)}` : undefined)}>{sale.presentation === "sellado" ? "Sellado: se conservan" : sale.photos_hold ? `Retenido: ${sale.photos_hold_reason || "Reclamación"}` : `${sale.photo_count || 0} fotos${sale.photos_cleanup_at ? ` · ${formatDate(sale.photos_cleanup_at)}` : ""}`}</p>
    {isAdmin && <div className="mt-0.5 flex flex-col items-start">
      <button type="button" disabled={busyId === sale.id} className="text-indigo-700 underline-offset-2 hover:underline disabled:opacity-40" onClick={() => photoAction(sale,"hold")}>{sale.photos_hold ? "Quitar retención" : "Conservar"}</button>
      <button type="button" disabled={busyId === sale.id || sale.presentation === "sellado" || sale.photos_hold || Number(sale.photo_count || 0)<2} className="text-red-700 underline-offset-2 hover:underline disabled:opacity-40" onClick={() => photoAction(sale,"cleanup")} title="Borrar fotos secundarias (la portada se conserva)">Borrar secundarias</button>
    </div>}
  </div>;

  const productCell = (sale: Sale) => <div className="flex w-56 items-center gap-2">
    <Thumb src={sale.product_image_url} alt="" />
    <span className="line-clamp-2 leading-tight" title={sale.title || undefined}>{sale.title || "-"}</span>
  </div>;

  const actions = (sale: Sale) => <div className="flex items-center gap-1.5 whitespace-nowrap">
    <button type="button" onClick={() => setPhotoSale(sale)} className={`${BTN} gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50`} title={sale.client_photo_url ? (sale.client_photo_public === false ? "Foto del cliente (oculta en la web)" : "Foto del cliente") : "Subir foto del cliente"}>
      {sale.client_photo_url
        ? <img src={sale.client_photo_url} alt="" className={`h-5 w-5 rounded-full object-cover ${sale.client_photo_public === false ? "opacity-40" : ""}`} />
        : <span aria-hidden="true" className="text-sm leading-none">+</span>}
      Cliente
    </button>
    <button type="button" onClick={() => openEditor(sale)} className={`${BTN} border-gray-200 text-gray-800 hover:bg-gray-50`}>Editar</button>
    <button type="button" onClick={() => restoreSale(sale)} disabled={busyId === sale.id} className={`${BTN} border-red-200 text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60`}>{busyId === sale.id ? "..." : "Cancelar"}</button>
    {canRetrySync(sale) && (
      <button type="button" onClick={() => retrySync(sale)} className={`${BTN} border-amber-400 text-amber-700 hover:bg-amber-50`}>
        {sale.sync_remote_status === "rejected" ? "Reenviar" : "Reintentar"}
      </button>
    )}
  </div>;

  const syncCell = (sale: Sale) => <div className="w-36" title={sale.sync_error || undefined}>
    <div>{syncLabel(sale)}</div>
    {sale.sync_error && <div className="mt-0.5 truncate text-xs text-red-700">{sale.sync_error}</div>}
  </div>;

  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Vendidos</h2>
        <button onClick={() => setOpen(true)} className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white">
          Lista Completa
        </button>
      </div>
      {isAdmin && <label className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">Ventas de<select aria-label="Vendedor en Vendidos" value={owner} onChange={e=>setOwner(e.target.value)} className="min-h-10 max-w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800"><option value="macsomenos">Macsomenos</option>{sellers.map(seller=><option key={seller.owner_id} value={String(seller.owner_id)}>{seller.username}</option>)}<option value="all">Todos</option></select></label>}
      <div className="overflow-auto max-h-[340px]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700">
              <th className="p-2">Producto</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Precio venta</th>
              <th className="p-2">Fecha</th>
              <th className="p-2">Servicios</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {recentSales.map((sale) => (
              <tr key={sale.id} className="h-14 border-t align-middle text-gray-900">
                <td className="p-2">{productCell(sale)}</td>
                <td className="whitespace-nowrap p-2">{displaySku(sale.sku) || "-"}</td>
                <td className="whitespace-nowrap p-2">S/ {Number(sale.sale_price || 0).toFixed(2)}</td>
                <td className="whitespace-nowrap p-2">{formatDate(sale.sold_at)}</td>
                <td className="p-2 text-gray-700">{syncCell(sale)}</td>
                <td className="p-2">{actions(sale)}</td>
              </tr>
            ))}
            {!recentSales.length && (
              <tr>
                <td className="p-2 text-gray-500" colSpan={6}>
                  {loading ? "Cargando ventas..." : "Sin registros"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-[1400px] p-5 text-gray-900 max-h-[86vh] overflow-auto">
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
                  <th className="p-2">Servicios</th>
                  <th className="p-2">Fotos</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="h-14 border-t align-middle">
                    <td className="p-2">{productCell(sale)}</td>
                    <td className="whitespace-nowrap p-2">{displaySku(sale.sku) || "-"}</td>
                    <td className="whitespace-nowrap p-2">S/ {Number(sale.sale_price || 0).toFixed(2)}</td>
                    <td className="whitespace-nowrap p-2">{formatDate(sale.sold_at)}</td>
                    <td className="p-2"><div className="flex w-36 items-center gap-2"><Thumb src={sale.client_photo_url} alt="" round dim={sale.client_photo_public === false} title={sale.client_photo_public === false ? "Oculta en la web" : "Visible en la web"} /><span className="truncate">{sale.customer_name || "-"}</span></div></td>
                    <td className="whitespace-nowrap p-2">{phone(sale.customer_phone)}</td>
                    <td className="p-2">{sale.customer_kind || "-"}</td>
                    <td className="p-2">{salePlace(sale)}</td>
                    <td className="p-2">{syncCell(sale)}</td>
                    <td className="p-2">{photoControls(sale)}</td>
                    <td className="p-2">{actions(sale)}</td>
                  </tr>
                ))}
                {!sales.length && (
                  <tr>
                    <td className="p-2 text-gray-500" colSpan={11}>
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
    {photoSale && (
        <SaleClientPhotoEditor
          sale={photoSale}
          onClose={() => setPhotoSale(null)}
          onSaved={(patch) => setSales((current) => current.map((item) => (item.id === photoSale.id ? { ...item, ...patch } : item)))}
        />
      )}
    </div>
  );
}
