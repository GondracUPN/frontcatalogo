"use client";
import React from "react";
import {
  discardPossibleClient,
  listContactRequests,
  listPossibleClients,
  markContactRequestAttended,
  markPossibleClientPurchased,
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
  const title = String(item?.product_title || "producto").trim();
  const color = String(item?.product_color || "").trim();
  const productAndColor = `${title}${color ? ` ${color}` : ""}`.trim();
  const price = formatPrice(item?.product_price);
  const type = String(item?.request_type || "purchase").toLowerCase();

  if (type === "offer") {
    return `${greeting} ${name}.

Le confirmo que su oferta por el ${productAndColor} ha sido aceptada por el monto de ${price}
Cuando guste, podemos coordinar el método de pago y la entrega.
Quedo atento(a). ¡Gracias por su interés!`;
  }

  if (type === "preventa") {
    return `${greeting} ${name}.

${productAndColor} se encuentra actualmente en preventa, con un precio de ${price}.

Tiene dos opciones:
1. Esperar a que el producto llegue, sin realizar ningún pago previo.
2. Reservarlo con un adelanto de S/ 50, para asegurar su unidad.

En caso de realizar la reserva, el cliente se compromete a concretar la compra en un plazo máximo de 3 días una vez que el producto esté disponible.
Si no se concreta dentro de ese plazo, el adelanto no es reembolsable y el producto quedará nuevamente disponible para la venta.

Quedo atento(a) para indicarle fechas estimadas o enviarle los datos para la reserva.`;
  }

  return `${greeting} ${name}.

Le escribo desde nuestro catálogo por su interés en ${productAndColor}, disponible a ${price}.
Quedo atento(a) para brindarle más información o coordinar la compra. ¡Gracias por contactarnos!`;
}

export default function ContactAlertsPanel({ initialItems }: { initialItems: ContactRequest[] }) {
  const [items, setItems] = React.useState<ContactRequest[]>(initialItems || []);
  const [clients, setClients] = React.useState<PossibleClient[]>([]);
  const [selected, setSelected] = React.useState<ContactRequest | null>(null);
  const [clientsOpen, setClientsOpen] = React.useState(false);
  const [purchaseClient, setPurchaseClient] = React.useState<PossibleClient | null>(null);
  const [customerKind, setCustomerKind] = React.useState<"tranquilo" | "regateador">("tranquilo");
  const [salePlaceType, setSalePlaceType] = React.useState<"almacen" | "otro">("almacen");
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
    if (!confirm("Descartar este posible cliente?")) return;
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
    setSalePlaceType("almacen");
    setSaleLocation("");
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
    const title = String(selected.product_title || "Producto").trim();
    const color = String(selected.product_color || "").trim();
    const product = `${title}${color ? ` ${color}` : ""}`.trim();
    const price = formatCopyPrice(selected.product_price);
    const district = String(selected.location_value || "").trim().toLowerCase();
    const payload = [`Producto: ${product}`, `Precio : S/ ${price}`, `Distrito : ${district}`, phone].join("\n");
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
                  {row.product_title || "-"}
                  {row.product_color ? ` ${row.product_color}` : ""}
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
                <div className="text-gray-500">Producto</div>
                <div className="font-medium">
                  {selected.product_title || "-"}
                  {selected.product_color ? ` ${selected.product_color}` : ""}
                </div>
              </div>
              <div>
                <div className="text-gray-500">Precio</div>
                <div className="font-medium">{formatPrice(selected.product_price)}</div>
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
                      <td className="p-2">{client.product_title || "-"}</td>
                      <td className="p-2">
                        {client.status === "purchased" ? (
                          <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            Compro - {client.customer_kind || "-"} - {client.sale_place_type === "otro" ? client.sale_location : "Almacen"}
                          </span>
                        ) : (
                          <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Pendiente</span>
                        )}
                      </td>
                      <td className="p-2">
                        {client.status === "purchased" ? (
                          <span className="text-xs text-gray-500">Registrado</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => openPurchase(client)} className="rounded bg-emerald-600 px-3 py-1 text-white">
                              Compro
                            </button>
                            <button onClick={() => discardClient(client)} disabled={busy} className="rounded bg-red-50 px-3 py-1 text-red-700 disabled:opacity-60">
                              Descarte
                            </button>
                          </div>
                        )}
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
