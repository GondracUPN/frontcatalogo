"use client";

import React from "react";
import { changeRequestStatusAction, listRequestsAction, requestDetailAction } from "./actions";
import { formatDate, formatMoney, PAYMENT_METHODS, STATUS_LABELS, STATUS_TONES, whatsappLink } from "./status";

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "activas", label: "Activas" },
  { value: "nueva", label: "Nuevas" },
  { value: "pendiente_confirmacion", label: "Por confirmar" },
  { value: "confirmada", label: "Confirmadas" },
  { value: "reservada", label: "Reservadas" },
  { value: "pagada", label: "Pagadas" },
  { value: "en_preparacion", label: "En preparación" },
  { value: "enviada", label: "Enviadas" },
  { value: "entregada", label: "Entregadas" },
  { value: "cancelada", label: "Canceladas" },
  { value: "", label: "Todas" },
];

function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_TONES[status] || "bg-gray-100"}`}>{STATUS_LABELS[status] || status}</span>;
}

export default function RequestsList({ initial, initialError }: { initial: { items: any[]; total: number; counts: Record<string, number> }; initialError: string }) {
  const [data, setData] = React.useState(initial);
  const [status, setStatus] = React.useState("activas");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(initialError);
  const [detail, setDetail] = React.useState<any | null>(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  const load = React.useCallback(async (next: { status?: string; q?: string; page?: number } = {}) => {
    setLoading(true);
    setError("");
    const result = await listRequestsAction({ status: next.status ?? status, q: next.q ?? query, page: next.page ?? page });
    setLoading(false);
    if (result.ok) setData(result.data);
    else setError(result.error);
  }, [page, query, status]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail({ id });
    const result = await requestDetailAction(id);
    setDetailLoading(false);
    if (result.ok) setDetail(result.data);
    else {
      setDetail(null);
      setError(result.error);
    }
  };

  const activeCount = Object.entries(data.counts || {}).filter(([key]) => !["entregada", "cancelada"].includes(key)).reduce((sum, [, n]) => sum + Number(n), 0);
  const pages = Math.max(1, Math.ceil((data.total || 0) / 30));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setPage(1);
            void load({ page: 1 });
          }}
        >
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por número, cliente, teléfono o producto"
            className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm"
          />
          <button type="submit" className="min-h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white">Buscar</button>
        </form>
      </div>
      <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTERS.map((filter) => {
          const count = filter.value === "activas" ? activeCount : filter.value ? data.counts?.[filter.value] || 0 : null;
          return (
            <button
              key={filter.value || "all"}
              type="button"
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
                void load({ status: filter.value, page: 1 });
              }}
              className={`min-h-10 shrink-0 rounded-full px-3 text-sm ${status === filter.value ? "bg-gray-900 font-semibold text-white" : "border border-gray-300 bg-white text-gray-700"}`}
            >
              {filter.label}{count !== null ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error} <button type="button" className="font-semibold underline" onClick={() => load()}>Reintentar</button></div>}
      {loading && <div role="status" className="text-sm text-gray-500">Cargando…</div>}

      {!loading && data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">No hay solicitudes en esta vista.</div>
      ) : (
        <ul className="grid gap-2">
          {data.items.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => openDetail(item.id)} className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm hover:border-gray-400">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{item.number}</span>
                    <StatusBadge status={item.status} />
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(item.created_at)}</span>
                </div>
                <div className="mt-2 grid gap-1 text-sm sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">{item.customer_name} · {item.customer_phone}</div>
                    <div className="truncate text-gray-600">{(item.items || []).map((it: any) => `${it.qty > 1 ? `${it.qty} × ` : ""}${it.title}`).join(", ")}</div>
                    <div className="truncate text-xs text-gray-500">{item.delivery_option_name || "Entrega"}{item.delivery_point_name ? ` · ${item.delivery_point_name}` : item.location_text ? ` · ${item.location_text}` : ""}</div>
                  </div>
                  <div className="font-semibold text-gray-900 sm:text-right">{formatMoney(item.items_total)}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void load({ page: next }); }} className="min-h-10 rounded-lg border px-3 text-sm disabled:opacity-40">Anterior</button>
          <span className="text-sm text-gray-600">Página {page} de {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => { const next = page + 1; setPage(next); void load({ page: next }); }} className="min-h-10 rounded-lg border px-3 text-sm disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {detail && (
        <RequestDetail
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          onChanged={(updated) => {
            setDetail(updated);
            void load();
          }}
        />
      )}
    </div>
  );
}

function RequestDetail({ detail, loading, onClose, onChanged }: { detail: any; loading: boolean; onClose: () => void; onChanged: (updated: any) => void }) {
  const [target, setTarget] = React.useState("");
  const [note, setNote] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState("");
  const [cancelReason, setCancelReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const submit = async () => {
    if (!target || saving) return;
    setSaving(true);
    setError("");
    const result = await changeRequestStatusAction(detail.id, { to: target, expectedStatus: detail.status, note: note || undefined, paymentMethod: paymentMethod || undefined, cancelReason: cancelReason || undefined });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTarget("");
    setNote("");
    setPaymentMethod("");
    setCancelReason("");
    onChanged(result.data);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => !saving && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={`Solicitud ${detail.number || ""}`} className="flex h-full w-full max-w-lg flex-col bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{detail.number || "…"}</span>
            {detail.status && <StatusBadge status={detail.status} />}
          </div>
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg border px-3 text-sm">Cerrar</button>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500" role="status">Cargando…</div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm">
            <section className="space-y-1">
              <h3 className="font-semibold text-gray-900">Cliente</h3>
              <div>{detail.customer_name}</div>
              <div className="flex flex-wrap items-center gap-2">
                <span>{detail.customer_phone}</span>
                <a href={whatsappLink(detail.customer_phone, detail.customer_name, detail.number)} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-green-600 px-3 font-semibold text-white">Abrir WhatsApp</a>
              </div>
            </section>
            <section className="space-y-1">
              <h3 className="font-semibold text-gray-900">Entrega</h3>
              <div>{detail.delivery_option_name || "—"}{Number(detail.delivery_cost) > 0 ? ` · ${formatMoney(detail.delivery_cost)}` : ""}</div>
              {(detail.delivery_point_name || detail.location_text) && (detail.delivery_point_name || detail.location_text) !== detail.district && <div>Lugar: {detail.delivery_point_name || detail.location_text}</div>}
              {detail.district && <div>Distrito: {detail.district}</div>}
              {detail.address && <div>Dirección: {detail.address}</div>}
              {detail.notes && <div className="rounded-lg bg-gray-50 p-2">Observaciones: {detail.notes}</div>}
            </section>
            <section className="space-y-2">
              <h3 className="font-semibold text-gray-900">Productos</h3>
              <ul className="divide-y rounded-xl border">
                {(detail.items || []).map((item: any) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 p-3">
                    <div className="min-w-0">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-gray-500">{[item.color, item.sku].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div>{item.qty} × {formatMoney(item.unit_price)}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="text-right font-semibold">Total productos (sin IGV): {formatMoney(detail.items_total)}</div>
            </section>
            {(detail.reservations || []).length > 0 && (
              <section className="space-y-1">
                <h3 className="font-semibold text-gray-900">Reservas de stock</h3>
                {(detail.reservations || []).map((reservation: any) => (
                  <div key={reservation.id} className="text-xs text-gray-600">
                    {reservation.qty} u. · {reservation.active ? (reservation.expires_at ? `vigente hasta ${formatDate(reservation.expires_at)}` : "vigente") : reservation.released_at ? `liberada ${formatDate(reservation.released_at)}` : "vencida"}
                  </div>
                ))}
              </section>
            )}

            {(detail.allowedTransitions || []).length > 0 && (
              <section className="space-y-2 rounded-xl border border-gray-200 p-3">
                <h3 className="font-semibold text-gray-900">Cambiar estado</h3>
                <div className="flex flex-wrap gap-2">
                  {detail.allowedTransitions.map((status: string) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setTarget(status)}
                      className={`min-h-10 rounded-lg border px-3 text-sm ${target === status ? "border-gray-900 bg-gray-900 text-white" : status === "cancelada" ? "border-red-200 text-red-700" : "border-gray-300"}`}
                    >
                      {STATUS_LABELS[status] || status}
                    </button>
                  ))}
                </div>
                {target === "pagada" && (
                  <label className="grid gap-1">Método de pago
                    <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="min-h-11 rounded-lg border px-3">
                      <option value="">Selecciona</option>
                      {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
                    </select>
                  </label>
                )}
                {target === "cancelada" && (
                  <label className="grid gap-1">Motivo de la cancelación
                    <input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} maxLength={300} className="min-h-11 rounded-lg border px-3" />
                  </label>
                )}
                {target === "reservada" && <p className="text-xs text-gray-600">Reserva las unidades durante 48 h. No descuenta el stock definitivo: la venta se registra con «Marcar vendido».</p>}
                {target === "entregada" && <p className="text-xs text-gray-600">Libera la reserva. Recuerda registrar la venta con «Marcar vendido» si aún no lo hiciste.</p>}
                {target && target !== "cancelada" && (
                  <label className="grid gap-1">Nota (opcional)
                    <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} className="min-h-11 rounded-lg border px-3" />
                  </label>
                )}
                {error && <div role="alert" className="text-red-700">{error}</div>}
                <button type="button" disabled={!target || saving} onClick={submit} className="min-h-11 w-full rounded-lg bg-gray-900 px-4 font-semibold text-white disabled:opacity-50">
                  {saving ? "Guardando…" : target ? `Pasar a «${STATUS_LABELS[target]}»` : "Elige un estado"}
                </button>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="font-semibold text-gray-900">Historial</h3>
              <ol className="space-y-2 border-l-2 border-gray-200 pl-3">
                {(detail.events || []).map((event: any) => (
                  <li key={event.id}>
                    <div className="font-medium">{event.from_status ? `${STATUS_LABELS[event.from_status] || event.from_status} → ` : ""}{STATUS_LABELS[event.to_status] || event.to_status}</div>
                    <div className="text-xs text-gray-500">{formatDate(event.created_at)} · {event.actor_username || "sistema"}{event.metadata?.paymentMethod ? ` · pago: ${event.metadata.paymentMethod}` : ""}</div>
                    {event.note && <div className="text-xs text-gray-700">{event.note}</div>}
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
