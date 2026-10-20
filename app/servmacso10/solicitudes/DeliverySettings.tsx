"use client";

import React from "react";
import {
  addPointAliasAction,
  listDeliveryOptionsAction,
  listDeliveryPointsAction,
  saveDeliveryOptionAction,
  saveDeliveryPointAction,
  unmatchedLocationsAction,
} from "./actions";

const KIND_LABELS: Record<string, string> = {
  pickup: "Recojo",
  cash_on_delivery: "Contraentrega",
  meeting_point: "Punto de encuentro",
  delivery: "Delivery",
  province: "Envío a provincia",
  other: "Otra",
};
const POINT_KIND_LABELS: Record<string, string> = { warehouse: "Almacén", mall: "Centro comercial", meeting_point: "Punto de encuentro", other: "Otro" };

const input = "min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm";
const label = "grid gap-1 text-sm font-medium text-gray-800";

export default function DeliverySettings() {
  const [options, setOptions] = React.useState<any[] | null>(null);
  const [points, setPoints] = React.useState<any[]>([]);
  const [unmatched, setUnmatched] = React.useState<any[]>([]);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");
  const [editingOption, setEditingOption] = React.useState<any | null>(null);
  const [editingPoint, setEditingPoint] = React.useState<any | null>(null);
  const [pointSuggestions, setPointSuggestions] = React.useState<any[] | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const [o, p, u] = await Promise.all([listDeliveryOptionsAction(), listDeliveryPointsAction(), unmatchedLocationsAction()]);
    if (!o.ok || !p.ok) {
      setError(!o.ok ? o.error : !p.ok ? p.error : "");
      setOptions([]);
      return;
    }
    setOptions(o.data.items);
    setPoints(p.data.items);
    // Un fallo en las sugerencias no impide administrar opciones y puntos.
    setUnmatched(u.ok ? u.data.items : []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const saveOption = async () => {
    if (!editingOption || saving) return;
    setSaving(true);
    setError("");
    const { id, ...body } = editingOption;
    const result = await saveDeliveryOptionAction(id || null, body);
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setEditingOption(null);
    setNotice("Opción de entrega guardada.");
    await load();
  };

  const savePoint = async (force = false) => {
    if (!editingPoint || saving) return;
    setSaving(true);
    setError("");
    const { id, aliasesText, ...rest } = editingPoint;
    const aliases = String(aliasesText || "").split(",").map((alias) => alias.trim()).filter(Boolean);
    const result = await saveDeliveryPointAction(id || null, { ...rest, aliases, force });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    if (result.data.needsConfirmation) {
      setPointSuggestions(result.data.suggestions || []);
      return;
    }
    setEditingPoint(null);
    setPointSuggestions(null);
    setNotice("Punto guardado.");
    await load();
  };

  const confirmAlias = async (pointId: string, text: string) => {
    const result = await addPointAliasAction(pointId, text);
    if (!result.ok) return setError(result.error);
    setNotice(`«${text}» quedó registrado como otro nombre del punto.`);
    await load();
  };

  if (options === null) return <div role="status" className="text-sm text-gray-500">Cargando…</div>;

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="flex justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><span>{error}</span><button type="button" onClick={() => setError("")} className="font-semibold">Cerrar</button></div>}
      {notice && <div role="status" className="flex justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"><span>{notice}</span><button type="button" onClick={() => setNotice("")} className="font-semibold">Cerrar</button></div>}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Opciones de entrega</h2>
          <button type="button" onClick={() => setEditingOption({ code: "", name: "", kind: "delivery", cost: 0, active: true, sortOrder: (options.length + 1) * 10 })} className="min-h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white">Nueva opción</button>
        </div>
        <p className="text-xs text-gray-600">Son las opciones que ve el cliente al enviar su solicitud. Desactiva una para ocultarla sin perder su historial.</p>
        <ul className="grid gap-2 md:grid-cols-2">
          {options.map((option) => (
            <li key={option.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{option.name}</div>
                  <div className="text-xs text-gray-500">{KIND_LABELS[option.kind] || option.kind} · {Number(option.cost) > 0 ? `S/ ${Number(option.cost).toFixed(2)}` : option.cost_note || "Sin costo"}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${option.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{option.active ? "Activa" : "Inactiva"}</span>
              </div>
              {option.description && <p className="mt-2 text-sm text-gray-600">{option.description}</p>}
              <button
                type="button"
                className="mt-3 min-h-10 rounded-lg border px-3 text-sm"
                onClick={() => setEditingOption({
                  id: option.id, code: option.code, name: option.name, kind: option.kind, description: option.description || "", cost: Number(option.cost),
                  costNote: option.cost_note || "", schedule: option.schedule || "", conditions: option.conditions || "", requiresPoint: option.requires_point,
                  requiresDistrict: option.requires_district, requiresAddress: option.requires_address, active: option.active, sortOrder: option.sort_order,
                })}
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Puntos de entrega</h2>
          <button type="button" onClick={() => { setPointSuggestions(null); setEditingPoint({ name: "", kind: "mall", aliasesText: "", district: "", address: "", active: true }); }} className="min-h-11 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white">Nuevo punto</button>
        </div>
        {points.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">Aún no hay puntos. Agrega los lugares donde sueles entregar (almacén, centros comerciales…).</div>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {points.map((point) => (
              <li key={point.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold">{point.name}</div>
                    <div className="text-xs text-gray-500">{POINT_KIND_LABELS[point.kind] || point.kind}{point.district ? ` · ${point.district}` : ""}</div>
                    {(point.aliases || []).length > 0 && <div className="mt-1 text-xs text-gray-600">También: {point.aliases.join(", ")}</div>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${point.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>{point.active ? "Activo" : "Inactivo"}</span>
                </div>
                <button type="button" className="mt-3 min-h-10 rounded-lg border px-3 text-sm" onClick={() => { setPointSuggestions(null); setEditingPoint({ ...point, aliasesText: (point.aliases || []).join(", ") }); }}>Editar</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Lugares escritos a mano sin asignar</h2>
        <p className="text-xs text-gray-600">Textos de solicitudes y ventas que no coinciden exactamente con un punto. Confirma si corresponden a uno: nada se fusiona sin tu confirmación.</p>
        {unmatched.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-600">No hay lugares pendientes de revisar.</div>
        ) : (
          <ul className="grid gap-2">
            {unmatched.map((entry) => (
              <li key={entry.text} className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium">«{entry.text}»</div>
                  <div className="text-xs text-gray-500">{entry.count} {entry.count === 1 ? "registro" : "registros"}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.suggestions.map((suggestion: any) => (
                    <button key={suggestion.id} type="button" onClick={() => confirmAlias(suggestion.id, entry.text)} className="min-h-10 rounded-lg border border-blue-300 px-3 text-sm text-blue-800">
                      Es «{suggestion.name}»
                    </button>
                  ))}
                  <button type="button" onClick={() => { setPointSuggestions(null); setEditingPoint({ name: entry.text, kind: "meeting_point", aliasesText: "", district: "", address: "", active: true }); }} className="min-h-10 rounded-lg border px-3 text-sm">Crear punto nuevo</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingOption && (
        <Modal title={editingOption.id ? "Editar opción de entrega" : "Nueva opción de entrega"} onClose={() => !saving && setEditingOption(null)}>
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void saveOption(); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>Nombre<input className={input} required maxLength={60} value={editingOption.name} onChange={(e) => setEditingOption({ ...editingOption, name: e.target.value })} /></label>
              <label className={label}>Código interno<input className={input} required pattern="[a-z0-9_]{2,40}" title="minúsculas, números o _" value={editingOption.code} onChange={(e) => setEditingOption({ ...editingOption, code: e.target.value.toLowerCase() })} /></label>
              <label className={label}>Tipo
                <select className={input} value={editingOption.kind} onChange={(e) => setEditingOption({ ...editingOption, kind: e.target.value })}>
                  {Object.entries(KIND_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                </select>
              </label>
              <label className={label}>Costo (S/)<input type="number" min={0} step="0.01" className={input} value={editingOption.cost} onChange={(e) => setEditingOption({ ...editingOption, cost: e.target.value })} /></label>
            </div>
            <label className={label}>Nota de costo (si varía)<input className={input} maxLength={100} placeholder="Ej.: según distrito" value={editingOption.costNote || ""} onChange={(e) => setEditingOption({ ...editingOption, costNote: e.target.value })} /></label>
            <label className={label}>Descripción<input className={input} maxLength={300} value={editingOption.description || ""} onChange={(e) => setEditingOption({ ...editingOption, description: e.target.value })} /></label>
            <label className={label}>Horario<input className={input} maxLength={200} placeholder="Ej.: lunes a sábado, 10:00–19:00" value={editingOption.schedule || ""} onChange={(e) => setEditingOption({ ...editingOption, schedule: e.target.value })} /></label>
            <label className={label}>Condiciones<textarea className={`${input} py-2`} rows={2} maxLength={500} value={editingOption.conditions || ""} onChange={(e) => setEditingOption({ ...editingOption, conditions: e.target.value })} /></label>
            <fieldset className="grid gap-1 text-sm">
              <legend className="font-medium">El cliente debe indicar</legend>
              {([["requiresPoint", "Punto de encuentro"], ["requiresDistrict", "Distrito"], ["requiresAddress", "Dirección"]] as const).map(([key, text]) => (
                <label key={key} className="flex min-h-10 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={Boolean(editingOption[key])} onChange={(e) => setEditingOption({ ...editingOption, [key]: e.target.checked })} />{text}</label>
              ))}
            </fieldset>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={Boolean(editingOption.active)} onChange={(e) => setEditingOption({ ...editingOption, active: e.target.checked })} />Visible para clientes</label>
              <label className={label}>Orden<input type="number" className={input} value={editingOption.sortOrder ?? 0} onChange={(e) => setEditingOption({ ...editingOption, sortOrder: Number(e.target.value) })} /></label>
            </div>
            <FormButtons saving={saving} onCancel={() => setEditingOption(null)} />
          </form>
        </Modal>
      )}

      {editingPoint && (
        <Modal title={editingPoint.id ? "Editar punto" : "Nuevo punto"} onClose={() => !saving && setEditingPoint(null)}>
          <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void savePoint(false); }}>
            <label className={label}>Nombre principal<input className={input} required maxLength={80} value={editingPoint.name} onChange={(e) => { setPointSuggestions(null); setEditingPoint({ ...editingPoint, name: e.target.value }); }} /></label>
            <label className={label}>Otros nombres (separados por comas)<input className={input} placeholder="Ej.: Jockey, CC Jockey" value={editingPoint.aliasesText || ""} onChange={(e) => setEditingPoint({ ...editingPoint, aliasesText: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={label}>Tipo
                <select className={input} value={editingPoint.kind} onChange={(e) => setEditingPoint({ ...editingPoint, kind: e.target.value })}>
                  {Object.entries(POINT_KIND_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                </select>
              </label>
              <label className={label}>Distrito<input className={input} maxLength={60} value={editingPoint.district || ""} onChange={(e) => setEditingPoint({ ...editingPoint, district: e.target.value })} /></label>
            </div>
            <label className={label}>Dirección (opcional)<input className={input} maxLength={200} value={editingPoint.address || ""} onChange={(e) => setEditingPoint({ ...editingPoint, address: e.target.value })} /></label>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={Boolean(editingPoint.active)} onChange={(e) => setEditingPoint({ ...editingPoint, active: e.target.checked })} />Activo</label>
            {pointSuggestions && pointSuggestions.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Ya existe un punto parecido:</p>
                <ul className="mt-1 list-disc pl-5">{pointSuggestions.map((suggestion) => <li key={suggestion.id}>{suggestion.name}</li>)}</ul>
                <p className="mt-2">Si es el mismo lugar, edita ese punto y agrega este nombre como alias. Si es otro lugar, confírmalo:</p>
                <button type="button" onClick={() => savePoint(true)} className="mt-2 min-h-10 rounded-lg border border-amber-400 bg-white px-3 font-semibold">Sí, es un lugar distinto</button>
              </div>
            )}
            <FormButtons saving={saving} onCancel={() => setEditingPoint(null)} />
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className="flex max-h-[calc(100dvh-16px)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="min-h-10 rounded-lg border px-3 text-sm">Cerrar</button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function FormButtons({ saving, onCancel }: { saving: boolean; onCancel: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onCancel} disabled={saving} className="min-h-11 flex-1 rounded-lg border px-4 text-sm sm:flex-none">Cancelar</button>
      <button type="submit" disabled={saving} className="min-h-11 flex-1 rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white disabled:opacity-60 sm:flex-none">{saving ? "Guardando…" : "Guardar"}</button>
    </div>
  );
}
