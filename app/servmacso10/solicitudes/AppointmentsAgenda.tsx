"use client";

import React from "react";
import {
  Appointment,
  AppointmentInput,
  changeAppointmentStatusAction,
  listAppointmentsAction,
  saveAppointmentAction,
  searchAppointmentProductsAction,
  type AppointmentProduct,
} from "./actions";
import { appointmentWhatsappLink, dayLabel, limaParts, limaTime, toLimaInput } from "./contact";

export type AppointmentPrefill = {
  customerName?: string;
  customerContact?: string;
  productTitle?: string;
  sku?: string;
  sourceRequestId?: string;
};

const REMINDER_LABELS: Record<string, string> = { day_before: "1 día antes (9:00)", same_day: "El mismo día (9:00)" };
const STATE_LABELS: Record<string, string> = { pending: "pendiente", processing: "enviando", accepted: "enviado", skipped: "omitido" };
const STATE_TONES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  skipped: "bg-gray-200 text-gray-700",
};

const emptyForm = { customerName: "", customerContact: "", productId: "", productTitle: "", sku: "", scheduledAt: "", note: "", sourceRequestId: "" };
type Form = typeof emptyForm;

export default function AppointmentsAgenda({ prefill, onPrefillUsed }: { prefill: AppointmentPrefill | null; onPrefillUsed: () => void }) {
  const [items, setItems] = React.useState<Appointment[]>([]);
  const [view, setView] = React.useState<"scheduled" | "done" | "cancelled">("scheduled");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [editing, setEditing] = React.useState<{ id: string | null; form: Form } | null>(null);
  const [busyId, setBusyId] = React.useState("");
  const [remindersEnabled, setRemindersEnabled] = React.useState(true);

  const load = React.useCallback(async (status: string) => {
    setLoading(true);
    setError("");
    const result = await listAppointmentsAction({ status });
    setLoading(false);
    if (result.ok) {
      setItems(result.data.items);
      setRemindersEnabled(result.data.remindersEnabled !== false);
    } else setError(result.error);
  }, []);

  React.useEffect(() => { void load(view); }, [load, view]);

  React.useEffect(() => {
    if (!prefill) return;
    setView("scheduled");
    setEditing({
      id: null,
      form: {
        ...emptyForm,
        customerName: prefill.customerName || "",
        customerContact: prefill.customerContact || "",
        productTitle: prefill.productTitle || "",
        sku: prefill.sku || "",
        sourceRequestId: prefill.sourceRequestId || "",
      },
    });
    onPrefillUsed();
  }, [prefill, onPrefillUsed]);

  const changeStatus = async (item: Appointment, status: "scheduled" | "done" | "cancelled") => {
    if (status === "cancelled" && !window.confirm("¿Cancelar esta cita? Se omitirán sus recordatorios.")) return;
    setBusyId(item.id);
    setError("");
    const result = await changeAppointmentStatusAction(item.id, status);
    setBusyId("");
    if (result.ok) void load(view);
    else setError(result.error);
  };

  const todayKey = limaParts(new Date()).key;
  // Agendadas cuya hora ya pasó y siguen sin cerrar (realizada/cancelada): se muestran aparte.
  const overdue = React.useMemo(() => (view === "scheduled" ? items.filter((item) => new Date(item.scheduled_at).getTime() < Date.now()) : []), [items, view]);
  const groups = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    const overdueIds = new Set(overdue.map((item) => item.id));
    for (const item of items) {
      if (overdueIds.has(item.id)) continue;
      const key = limaParts(item.scheduled_at).key;
      map.set(key, [...(map.get(key) || []), item]);
    }
    return Array.from(map.entries());
  }, [items, overdue]);

  const renderItem = (item: Appointment, showDay = false) => {
    const link = appointmentWhatsappLink(item.customer_contact, item.customer_name, item.product_title);
    return (
      <li key={item.id} className="space-y-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-base font-semibold text-gray-900">{showDay ? `${dayLabel(limaParts(item.scheduled_at).key, todayKey)} · ` : ""}{limaTime(item.scheduled_at)}</span>
          <span className="font-medium text-gray-900">{item.customer_name || "Cliente sin nombre"}</span>
        </div>
        <div className="text-gray-700">{item.customer_contact.startsWith("@") ? `Usuario WhatsApp: ${item.customer_contact}` : `Número: ${item.customer_contact}`}</div>
        <div className="text-gray-700">{item.product_title} · SKU {item.sku || "-"}</div>
        {item.note && <div className="rounded-lg bg-gray-50 p-2 text-gray-700">{item.note}</div>}
        {item.status === "scheduled" && (
          <div className="flex flex-wrap gap-1.5">
            {(["day_before", "same_day"] as const).map((kind) => {
              const reminder = item.reminders?.[kind];
              if (!reminder) return null;
              return (
                <span key={kind} title={reminder.lastError || reminder.reason || ""} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_TONES[reminder.state] || "bg-gray-100"}`}>
                  {REMINDER_LABELS[kind]}: {STATE_LABELS[reminder.state] || reminder.state}
                </span>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-green-600 px-3 font-semibold text-white">Abrir WhatsApp</a>}
          {item.status === "scheduled" ? (
            <>
              <button type="button" disabled={busyId === item.id} onClick={() => setEditing({ id: item.id, form: formFromAppointment(item) })} className="min-h-11 rounded-lg border border-gray-300 px-3 disabled:opacity-50">Reprogramar / editar</button>
              <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item, "done")} className="min-h-11 rounded-lg border border-gray-300 px-3 disabled:opacity-50">Marcar realizada</button>
              <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item, "cancelled")} className="min-h-11 rounded-lg border border-red-200 px-3 text-red-700 disabled:opacity-50">Cancelar</button>
            </>
          ) : (
            <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item, "scheduled")} className="min-h-11 rounded-lg border border-gray-300 px-3 disabled:opacity-50">Volver a agendar</button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {([["scheduled", "Próximas"], ["done", "Realizadas"], ["cancelled", "Canceladas"]] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => setView(value)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${view === value ? "bg-gray-900 font-semibold text-white" : "border border-gray-300 bg-white text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setEditing({ id: null, form: emptyForm })} className="min-h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white">
          Agendar cita
        </button>
      </div>
      <p className="text-xs text-gray-600">
        {remindersEnabled
          ? "Te avisamos por WhatsApp a las 9:00 (hora de Lima) del día anterior y del mismo día de cada cita."
          : "Los avisos por WhatsApp son solo para las citas de Macsomenos; tus citas no generan avisos automáticos."}
      </p>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <div role="status" className="text-sm text-gray-500">Cargando…</div>}
      {!loading && groups.length === 0 && overdue.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">No hay citas en esta vista.</div>
      )}

      {overdue.length > 0 && (
        <section className="space-y-2" aria-label="Vencidas sin cerrar">
          <h3 className="text-sm font-semibold text-amber-800">Vencidas sin cerrar ({overdue.length})</h3>
          <ul className="grid gap-2">{overdue.map((item) => renderItem(item, true))}</ul>
        </section>
      )}

      {groups.map(([key, list]) => (
        <section key={key} className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">{dayLabel(key, todayKey)}</h3>
          <ul className="grid gap-2">
            {list.map((item) => renderItem(item))}
          </ul>
        </section>
      ))}

      {editing && (
        <AppointmentForm
          id={editing.id}
          initial={editing.form}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); setView("scheduled"); void load("scheduled"); }}
        />
      )}
    </div>
  );
}

function formFromAppointment(item: Appointment): Form {
  return {
    customerName: item.customer_name || "",
    customerContact: item.customer_contact,
    productId: item.product_id || "",
    productTitle: item.product_title,
    sku: item.sku || "",
    scheduledAt: toLimaInput(item.scheduled_at),
    note: item.note || "",
    sourceRequestId: item.source_request_id || "",
  };
}

function AppointmentForm({ id, initial, onClose, onSaved }: { id: string | null; initial: Form; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = React.useState<Form>(initial);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [results, setResults] = React.useState<AppointmentProduct[]>([]);
  const [searching, setSearching] = React.useState(false);
  const field = (name: keyof Form) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((current) => ({ ...current, [name]: event.target.value }));

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !saving) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const search = async () => {
    setSearching(true);
    const result = await searchAppointmentProductsAction(form.productTitle);
    setSearching(false);
    setResults(result.ok ? result.data.items : []);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setError("");
    if (!form.scheduledAt) return setError("Elige fecha y hora de la cita.");
    const body: Partial<AppointmentInput> = {
      customerName: form.customerName,
      customerContact: form.customerContact,
      productId: form.productId || null,
      productTitle: form.productTitle,
      sku: form.sku,
      // Hora de Lima explícita: no depende de la zona del navegador.
      scheduledAt: `${form.scheduledAt}${form.scheduledAt.length === 16 ? ":00" : ""}-05:00`,
      note: form.note,
    };
    if (!id && form.sourceRequestId) body.sourceRequestId = form.sourceRequestId;
    setSaving(true);
    const result = await saveAppointmentAction(id, body);
    setSaving(false);
    if (result.ok) onSaved();
    else setError(result.error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => !saving && onClose()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={id ? "Editar cita" : "Agendar cita"}
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-lg space-y-3 overflow-y-auto rounded-t-2xl bg-white p-4 text-sm shadow-xl sm:rounded-2xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">{id ? "Reprogramar / editar cita" : "Agendar cita"}</h2>
        <label className="grid gap-1">Cliente (opcional)
          <input value={form.customerName} onChange={field("customerName")} maxLength={120} className="min-h-11 rounded-lg border px-3" />
        </label>
        <label className="grid gap-1">Número o usuario de WhatsApp
          <input value={form.customerContact} onChange={field("customerContact")} required maxLength={40} inputMode="text" placeholder="987654321 o @usuario" className="min-h-11 rounded-lg border px-3" />
        </label>
        <div className="grid gap-1">
          <label htmlFor="appointment-product">Producto</label>
          <div className="flex gap-2">
            <input
              id="appointment-product"
              value={form.productTitle}
              onChange={(event) => setForm((current) => ({ ...current, productTitle: event.target.value, productId: "" }))}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }}
              required
              maxLength={200}
              placeholder="Escribe para buscar en el inventario o ingrésalo a mano"
              className="min-h-11 w-full rounded-lg border px-3"
            />
            <button type="button" onClick={search} disabled={searching || form.productTitle.trim().length < 2} className="min-h-11 shrink-0 rounded-lg border border-gray-300 px-3 disabled:opacity-50">{searching ? "…" : "Buscar"}</button>
          </div>
          {results.length > 0 && (
            <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border">
              {results.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    className="min-h-11 w-full px-3 py-2 text-left hover:bg-gray-50"
                    onClick={() => { setForm((current) => ({ ...current, productId: product.catalogProductId || "", productTitle: product.title.slice(0, 200), sku: product.sku })); setResults([]); }}
                  >
                    <span className="block truncate font-medium">{product.title}</span>
                    <span className="block text-xs text-gray-500">SKU {product.sku || "-"}{product.status === "published" ? " · publicado" : ""}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="grid gap-1">SKU
          <input value={form.sku} onChange={field("sku")} maxLength={80} className="min-h-11 rounded-lg border px-3" />
        </label>
        <label className="grid gap-1">Fecha y hora (Lima)
          <input type="datetime-local" value={form.scheduledAt} onChange={field("scheduledAt")} required className="min-h-11 rounded-lg border px-3" />
        </label>
        <label className="grid gap-1">Nota (opcional)
          <textarea value={form.note} onChange={field("note")} maxLength={500} rows={2} className="rounded-lg border px-3 py-2" />
        </label>
        {error && <div role="alert" className="text-red-700">{error}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-11 flex-1 rounded-lg border border-gray-300 px-4">Cerrar</button>
          <button type="submit" disabled={saving} className="min-h-11 flex-1 rounded-lg bg-gray-900 px-4 font-semibold text-white disabled:opacity-50">{saving ? "Guardando…" : "Guardar cita"}</button>
        </div>
      </form>
    </div>
  );
}
