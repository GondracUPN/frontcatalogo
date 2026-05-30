"use client";
import React from "react";
import {
  discardPossibleClient,
  listContactRequests,
  listPossibleClients,
  markContactRequestAttended,
  markPossibleClientPurchased,
  updatePossibleClient,
} from "../../actions";

type ContactRequest = {
  id: string;
  cart_id?: string;
  request_type?: "purchase" | "offer" | "preventa" | string;
  product_id?: string | null;
  product_title?: string;
  product_color?: string | null;
  product_price?: string | number | null;
  customer_name?: string;
  customer_phone?: string;
  location_scope?: "lima" | "provincia" | string;
  location_value?: string;
  metadata?: any;
  created_at?: string;
};

type PossibleClient = ContactRequest & {
  status?: "pending" | "purchased" | string;
  customer_kind?: string | null;
  sale_place_type?: string | null;
  sale_location?: string | null;
  purchased_at?: string | null;
};

type RequestCartItem = {
  title: string;
  color: string;
  qty: number;
  price: unknown;
  lineTotal: unknown;
};

function formatPrice(value: unknown) {
  const n = Number(value || 0);
  return `S/ ${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

function formatCopyPrice(value: unknown) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.trunc(n)) < 0.000001) return String(Math.trunc(n));
  return n.toFixed(2);
}

function parseMetadata(metadata: unknown) {
  try {
    if (!metadata) return {};
    if (typeof metadata === "string") return JSON.parse(metadata);
    if (typeof metadata === "object") return metadata as Record<string, any>;
    return {};
  } catch {
    return {};
  }
}

function getRequestItems(item: ContactRequest): RequestCartItem[] {
  const metadata = parseMetadata(item?.metadata);
  const rawItems = Array.isArray(metadata?.items) ? metadata.items : [];
  const normalized = rawItems
    .map((raw: any) => {
      const title = String(raw?.title || raw?.product_title || raw?.name || "").trim();
      const color = String(raw?.color || raw?.product_color || "").trim();
      const qty = Number(raw?.qty || raw?.quantity || 1);
      return {
        title: title || "Producto",
        color,
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        price: raw?.price ?? raw?.product_price ?? 0,
        lineTotal: raw?.lineTotal ?? raw?.line_total ?? null,
      };
    })
    .filter((row: RequestCartItem) => row.title);

  if (normalized.length) return normalized;

  const title = String(item?.product_title || "Producto").trim();
  const color = String(item?.product_color || "").trim();
  return [{ title, color, qty: 1, price: item?.product_price ?? 0, lineTotal: item?.product_price ?? 0 }];
}

function productName(row: RequestCartItem) {
  return `${row.title}${row.color ? ` ${row.color}` : ""}`.trim();
}

function productLine(row: RequestCartItem) {
  const qty = Number(row.qty || 1);
  const qtyText = qty > 1 ? `${qty} x ` : "";
  return `${qtyText}${productName(row)} - ${formatPrice(resolveLineTotal(row))}`;
}

function copyProductLine(row: RequestCartItem) {
  const qty = Number(row.qty || 1);
  const qtyText = qty > 1 ? `${qty} x ` : "";
  return `${qtyText}${productName(row)} - S/ ${formatCopyPrice(resolveLineTotal(row))}`;
}

function productSummary(item: ContactRequest) {
  return getRequestItems(item).map((row) => productName(row)).join(" / ");
}

function resolveLineTotal(row: RequestCartItem) {
  const explicit = Number(row.lineTotal);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const price = Number(row.price || 0);
  const qty = Number(row.qty || 1);
  return Number.isFinite(price) && Number.isFinite(qty) ? price * Math.max(1, qty) : 0;
}

function requestTotal(item: ContactRequest) {
  const total = getRequestItems(item).reduce((sum, row) => sum + Number(resolveLineTotal(row) || 0), 0);
  if (Number.isFinite(total) && total > 0) return total;
  return item?.product_price ?? 0;
}

function salePlaceLabel(item: PossibleClient) {
  const type = String(item.sale_place_type || "").trim();
  const location = String(item.sale_location || "").trim();
  if (type === "otro") return location || "-";
  if (type === "almacen") return "Almacen";
  return "-";
}

function peruHour() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Lima",
    hour12: false,
    hour: "2-digit",
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value || "0");
}

function greetingByPeruTime() {
  const hour = peruHour();
  if (hour >= 4 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

function composeMessage(item: ContactRequest) {
  const greeting = greetingByPeruTime();
  const name = String(item?.customer_name || "cliente").trim();
  const productsBlock = getRequestItems(item).map((row) => `- ${productLine(row)}`).join("\n");
  const type = String(item?.request_type || "purchase").toLowerCase();

  if (type === "offer") {
    return `${greeting} ${name}.

Le confirmo que recibimos su solicitud por:

${productsBlock}

Cuando guste, podemos coordinar el metodo de pago y la entrega.
Quedo atento(a). ¡Gracias por su interés!`;
  }

  if (type === "preventa") {
    return `${greeting} ${name}.

Su solicitud incluye:

${productsBlock}

Tiene dos opciones:
1. Esperar a que el producto llegue, sin realizar ningún pago previo.
2. Reservarlo con un adelanto de S/ 50, para asegurar su unidad.

En caso de realizar la reserva, el cliente se compromete a concretar la compra en un plazo máximo de 3 días una vez que el producto esté disponible.
Si no se concreta dentro de ese plazo, el adelanto no es reembolsable y el producto quedará nuevamente disponible para la venta.

Quedo atento(a) para indicarle fechas estimadas o enviarle los datos para la reserva.`;
  }

  return `${greeting} ${name}.

Le escribo desde nuestro catalogo por su interes en:

${productsBlock}

Quedo atento(a) para brindarle más información o coordinar la compra. ¡Gracias por contactarnos!`;
}

export default function ContactAlertsPanel({ initialItems }: { initialItems: ContactRequest[] }) {
  const [items, setItems] = React.useState<ContactRequest[]>(initialItems || []);
  const [clients, setClients] = React.useState<PossibleClient[]>([]);
  const [selected, setSelected] = React.useState<ContactRequest | null>(null);
  const [clientsOpen, setClientsOpen] = React.useState(false);
  const [purchaseClient, setPurchaseClient] = React.useState<PossibleClient | null>(null);
  const [editClient, setEditClient] = React.useState<PossibleClient | null>(null);
  const [editDraft, setEditDraft] = React.useState<Record<string, string>>({});
  const [customerKind, setCustomerKind] = React.useState<"tranquilo" | "regateador">("tranquilo");
  const [salePlaceType, setSalePlaceType] = React.useState<"" | "almacen" | "otro">("");
  const [saleLocation, setSaleLocation] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [copiedPhone, setCopiedPhone] = React.useState(false);
  const [copiedText, setCopiedText] = React.useState(false);

  const refreshAlerts = React.useCallback(async () => {
    const res = await listContactRequests();
    setItems(Array.isArray(res?.items) ? (res.items as ContactRequest[]) : []);
  }, []);

  const refreshClients = React.useCallback(async () => {
    const res = await listPossibleClients();
    setClients(Array.isArray(res?.items) ? (res.items as PossibleClient[]) : []);
  }, []);

  React.useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const [alertsRes, clientsRes] = await Promise.all([listContactRequests(), listPossibleClients()]);
        if (!active) return;
        setItems(Array.isArray(alertsRes?.items) ? (alertsRes.items as ContactRequest[]) : []);
        setClients(Array.isArray(clientsRes?.items) ? (clientsRes.items as PossibleClient[]) : []);
      } catch {
        // no-op
      }
    };
    run();
    const t = setInterval(run, 15000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, []);

  const attendSelected = async () => {
    if (!selected) return;
    await attendRequest(selected);
  };

  const attendRequest = async (request: ContactRequest) => {
    setBusy(true);
    try {
      await markContactRequestAttended(request.id);
      setSelected(null);
      await Promise.all([refreshAlerts(), refreshClients()]);
    } finally {
      setBusy(false);
    }
  };

  const discardClient = async (client: PossibleClient) => {
    if (!confirm("Borrar este cliente?")) return;
    setBusy(true);
    try {
      await discardPossibleClient(client.id);
      await refreshClients();
    } finally {
      setBusy(false);
    }
  };

  const openPurchase = (client: PossibleClient) => {
    setPurchaseClient(client);
    setCustomerKind("tranquilo");
    setSalePlaceType("");
    setSaleLocation("");
  };

  const openEdit = (client: PossibleClient) => {
    setEditClient(client);
    setEditDraft({
      customerName: String(client.customer_name || ""),
      customerPhone: String(client.customer_phone || "").replace(/\D+/g, ""),
      productTitle: String(client.product_title || ""),
      productColor: String(client.product_color || ""),
      productPrice: String(client.product_price || "0"),
      locationScope: String(client.location_scope || ""),
      locationValue: String(client.location_value || ""),
      requestType: String(client.request_type || ""),
      customerKind: String(client.customer_kind || ""),
      salePlaceType: String(client.sale_place_type || ""),
      saleLocation: String(client.sale_location || ""),
    });
  };

  const saveEdit = async () => {
    if (!editClient) return;
    setBusy(true);
    try {
      await updatePossibleClient(editClient.id, editDraft);
      setEditClient(null);
      setEditDraft({});
      await refreshClients();
    } finally {
      setBusy(false);
    }
  };

  const savePurchase = async () => {
    if (!purchaseClient) return;
    setBusy(true);
    try {
      await markPossibleClientPurchased(purchaseClient.id, {
        customerKind,
        salePlaceType,
        saleLocation: salePlaceType === "otro" ? saleLocation : "",
      });
      setPurchaseClient(null);
      await refreshClients();
    } finally {
      setBusy(false);
    }
  };

  const copyPhone = async () => {
    if (!selected) return;
    const phone = String(selected.customer_phone || "").replace(/\D+/g, "");
    const productLines = getRequestItems(selected).map((row) => `- ${copyProductLine(row)}`).join("\n");
    const district = String(selected.location_value || "").trim().toLowerCase();
    const payload = [`Productos:`, productLines, `Distrito : ${district}`, phone].join("\n");
    await navigator.clipboard.writeText(payload);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 1400);
  };

  const copyText = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(composeMessage(selected));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 1400);
  };

  return (
    <div className="bg-white rounded-2xl border p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-900">Alertas</h2>
        <button onClick={() => setClientsOpen(true)} className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white">
          Clientes ({clients.length})
        </button>
      </div>
      <div className="overflow-auto max-h-[340px]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700">
              <th className="p-2">Producto</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2 text-gray-900">
                  {getRequestItems(row).map((product, index) => (
                    <div key={`${row.id}-${index}`}>{productLine(product)}</div>
                  ))}
                </td>
                <td className="p-2 text-gray-900">
                  {String(row.request_type || "purchase").toLowerCase() === "preventa"
                    ? "Preventa"
                    : String(row.request_type || "purchase").toLowerCase() === "offer"
                      ? "Mejor oferta"
                      : "Compra"}
                </td>
                <td className="p-2">
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelected(row)} className="px-3 py-1 rounded bg-amber-600 text-white">
                      Ver
                    </button>
                    <button onClick={() => attendRequest(row)} disabled={busy} className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60">
                      Atendido
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td className="p-2 text-gray-500" colSpan={3}>
                  Sin alertas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl p-5 text-gray-900">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Solicitud de compra</h3>
              <button
                onClick={() => {
                  setSelected(null);
                  setCopiedPhone(false);
                  setCopiedText(false);
                }}
                aria-label="Cerrar"
              >
                X
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm mb-4">
              <div>
                <div className="text-gray-500">Productos</div>
                <div className="space-y-1 font-medium">
                  {getRequestItems(selected).map((product, index) => (
                    <div key={`${selected.id}-detail-${index}`}>{productLine(product)}</div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Total</div>
                <div className="font-medium">{formatPrice(requestTotal(selected))}</div>
              </div>
              <div>
                <div className="text-gray-500">Cliente</div>
                <div className="font-medium">{selected.customer_name || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Contacto</div>
                <div className="font-medium">{String(selected.customer_phone || "").replace(/\D+/g, "") || "-"}</div>
              </div>
              <div>
                <div className="text-gray-500">Ubicación</div>
                <div className="font-medium">{selected.location_value || "-"}</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={copyPhone} className="px-3 py-2 rounded bg-emerald-600 text-white">
                {copiedPhone ? "Contacto copiado" : "Copiar contacto"}
              </button>
              <button onClick={copyText} className="px-3 py-2 rounded bg-gray-900 text-white">
                {copiedText ? "Texto copiado" : "Texto"}
              </button>
              <button onClick={attendSelected} disabled={busy} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-60">
                {busy ? "Guardando..." : "Atendido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {clientsOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl p-5 text-gray-900 max-h-[86vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Posibles clientes</h3>
              <button onClick={() => setClientsOpen(false)} aria-label="Cerrar">X</button>
            </div>

            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-700">
                    <th className="p-2">Cliente</th>
                    <th className="p-2">Numero</th>
                    <th className="p-2">Ubicacion</th>
                    <th className="p-2">Producto</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id} className="border-t">
                      <td className="p-2">{client.customer_name || "-"}</td>
                      <td className="p-2">{String(client.customer_phone || "").replace(/\D+/g, "") || "-"}</td>
                      <td className="p-2">
                        {client.location_value || "-"}
                        {client.location_scope ? <span className="text-gray-500"> ({client.location_scope})</span> : null}
                      </td>
                      <td className="p-2">{productSummary(client) || "-"}</td>
                      <td className="p-2">
                        {client.status === "purchased" ? (
                          <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            Compro - {client.customer_kind || "-"} - {salePlaceLabel(client)}
                          </span>
                        ) : (
                          <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Pendiente</span>
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          {client.status !== "purchased" && (
                            <button onClick={() => openPurchase(client)} className="rounded bg-emerald-600 px-3 py-1 text-white">
                              Compro
                            </button>
                          )}
                          <button onClick={() => openEdit(client)} disabled={busy} className="rounded bg-indigo-50 px-3 py-1 text-indigo-700 disabled:opacity-60">
                            Editar
                          </button>
                          <button onClick={() => discardClient(client)} disabled={busy} className="rounded bg-red-50 px-3 py-1 text-red-700 disabled:opacity-60">
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!clients.length && (
                    <tr>
                      <td className="p-2 text-gray-500" colSpan={6}>Sin posibles clientes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {editClient && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-5 text-gray-900 max-h-[86vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Editar cliente</h3>
              <button onClick={() => setEditClient(null)} aria-label="Cerrar">X</button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block font-medium text-gray-700">Cliente</label>
                <input value={editDraft.customerName || ""} onChange={(e) => setEditDraft({ ...editDraft, customerName: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Numero</label>
                <input value={editDraft.customerPhone || ""} onChange={(e) => setEditDraft({ ...editDraft, customerPhone: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Producto</label>
                <input value={editDraft.productTitle || ""} onChange={(e) => setEditDraft({ ...editDraft, productTitle: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Color</label>
                <input value={editDraft.productColor || ""} onChange={(e) => setEditDraft({ ...editDraft, productColor: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Precio</label>
                <input type="number" value={editDraft.productPrice || ""} onChange={(e) => setEditDraft({ ...editDraft, productPrice: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Tipo de solicitud</label>
                <select value={editDraft.requestType || ""} onChange={(e) => setEditDraft({ ...editDraft, requestType: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 bg-white">
                  <option value="">Sin tipo</option>
                  <option value="purchase">Compra</option>
                  <option value="offer">Mejor oferta</option>
                  <option value="preventa">Preventa</option>
                  <option value="manual-sale">Venta manual</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-700">Zona</label>
                <select value={editDraft.locationScope || ""} onChange={(e) => setEditDraft({ ...editDraft, locationScope: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 bg-white">
                  <option value="">Sin zona</option>
                  <option value="lima">Lima</option>
                  <option value="provincia">Provincia</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-700">Ubicacion</label>
                <input value={editDraft.locationValue || ""} onChange={(e) => setEditDraft({ ...editDraft, locationValue: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" />
              </div>
              <div>
                <label className="block font-medium text-gray-700">Tipo de cliente</label>
                <select value={editDraft.customerKind || ""} onChange={(e) => setEditDraft({ ...editDraft, customerKind: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 bg-white">
                  <option value="">Sin registrar</option>
                  <option value="tranquilo">Tranquilo</option>
                  <option value="regateador">Regateador</option>
                </select>
              </div>
              <div>
                <label className="block font-medium text-gray-700">Lugar de venta</label>
                <select value={editDraft.salePlaceType || ""} onChange={(e) => setEditDraft({ ...editDraft, salePlaceType: e.target.value, saleLocation: e.target.value === "almacen" ? "" : editDraft.saleLocation || "" })} className="mt-1 w-full rounded border px-3 py-2 bg-white">
                  <option value="">Sin registrar</option>
                  <option value="almacen">Almacen</option>
                  <option value="otro">Otro lado</option>
                </select>
              </div>
              {editDraft.salePlaceType === "otro" && (
                <div className="sm:col-span-2">
                  <label className="block font-medium text-gray-700">Ubicacion de la venta</label>
                  <input value={editDraft.saleLocation || ""} onChange={(e) => setEditDraft({ ...editDraft, saleLocation: e.target.value })} className="mt-1 w-full rounded border px-3 py-2" />
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditClient(null)} className="rounded border px-3 py-2">Cancelar</button>
              <button
                onClick={saveEdit}
                disabled={busy || !String(editDraft.customerName || "").trim() || !String(editDraft.customerPhone || "").trim()}
                className="rounded bg-indigo-600 px-3 py-2 text-white disabled:opacity-60"
              >
                {busy ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {purchaseClient && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-5 text-gray-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Registrar compra</h3>
              <button onClick={() => setPurchaseClient(null)} aria-label="Cerrar">X</button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <div className="text-gray-500">Cliente</div>
                <div className="font-medium">{purchaseClient.customer_name || "-"} - {String(purchaseClient.customer_phone || "").replace(/\D+/g, "")}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo de cliente</label>
                <select value={customerKind} onChange={(e) => setCustomerKind(e.target.value as any)} className="mt-1 w-full rounded border px-3 py-2">
                  <option value="tranquilo">Tranquilo</option>
                  <option value="regateador">Regateador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Lugar de venta</label>
                <select value={salePlaceType} onChange={(e) => setSalePlaceType(e.target.value as any)} className="mt-1 w-full rounded border px-3 py-2">
                  <option value="">-</option>
                  <option value="almacen">Almacen</option>
                  <option value="otro">Otro lado</option>
                </select>
              </div>

              {salePlaceType === "otro" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ubicacion de la venta</label>
                  <input value={saleLocation} onChange={(e) => setSaleLocation(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" placeholder="Ej: Miraflores, Jockey Plaza, provincia..." />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setPurchaseClient(null)} className="rounded border px-3 py-2">Cancelar</button>
                <button
                  onClick={savePurchase}
                  disabled={busy || (salePlaceType === "otro" && !saleLocation.trim())}
                  className="rounded bg-emerald-600 px-3 py-2 text-white disabled:opacity-60"
                >
                  {busy ? "Guardando..." : "Guardar compra"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
