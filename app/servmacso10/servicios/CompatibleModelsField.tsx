"use client";
import React from "react";
import { getAccessoryCompatibleModels } from "../../actions";
import {
  COMPATIBLE_FAMILIES,
  MAX_MODELS,
  cleanCompatibleModels,
  modelsOf,
  rangesOfFamily,
  screensOf,
  type CompatibleModelRow,
} from "@/lib/accessory-compatibility";

export type CompatibleModelsValue = {
  labels: string[];
  /** unchanged: sin tocar (no se envía); manual: se guarda la lista; services: se quita la edición manual. */
  mode: "unchanged" | "manual" | "services";
};

type Props = {
  value: CompatibleModelsValue;
  /** Lista que envió Servicios (se muestra al volver a «Usar datos de Servicios»). */
  servicesLabels: string[];
  /** La ficha ya tiene una edición manual guardada. */
  hasManual: boolean;
  onChange: (value: CompatibleModelsValue) => void;
};

const selectClass = "mt-1 w-full rounded-lg border border-gray-300 bg-white p-2 text-sm";

/** Selector en cascada Familia → Gama → Tamaño → Modelos; lo marcado se guarda en un único conjunto de nombres. */
export default function CompatibleModelsField({ value, servicesLabels, hasManual, onChange }: Props) {
  const [rows, setRows] = React.useState<CompatibleModelRow[]>([]);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = React.useState("");
  const [family, setFamily] = React.useState<string>(COMPATIBLE_FAMILIES[0].id);
  const [range, setRange] = React.useState("");
  const [screen, setScreen] = React.useState("");

  const load = React.useCallback(async () => {
    setState("loading");
    const result = await getAccessoryCompatibleModels();
    if (result.ok) {
      setRows(result.rows);
      setState("ready");
      setError("");
    } else {
      setState("error");
      setError(result.error);
    }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const ranges = React.useMemo(() => rangesOfFamily(rows, family), [rows, family]);
  const activeRange = ranges.includes(range) ? range : ranges[0] || "";
  const screens = React.useMemo(() => screensOf(rows, family, activeRange), [rows, family, activeRange]);
  const activeScreen = screens.includes(screen) ? screen : "";
  const visible = React.useMemo(() => modelsOf(rows, family, activeRange, activeScreen), [rows, family, activeRange, activeScreen]);

  const selected = React.useMemo(() => new Set(value.labels.map((label) => label.toLowerCase())), [value.labels]);
  const emit = (labels: string[]) => {
    const clean = cleanCompatibleModels(labels);
    // Sin edición manual previa, un conjunto igual al de Servicios (sin importar mayúsculas ni orden) no se guarda como manual.
    const same = new Set(servicesLabels.map((label) => label.toLowerCase()));
    const unchanged = !hasManual && clean.length === same.size && clean.every((label) => same.has(label.toLowerCase()));
    onChange({ labels: clean, mode: unchanged ? "unchanged" : "manual" });
  };
  const full = value.labels.length >= MAX_MODELS;
  const toggle = (label: string) => {
    const key = label.toLowerCase();
    emit(selected.has(key) ? value.labels.filter((current) => current.toLowerCase() !== key) : [...value.labels, label]);
  };

  return (
    <fieldset className="space-y-3 rounded-xl border border-gray-200 p-4">
      <legend className="px-1 font-semibold">Modelos compatibles (opcional)</legend>
      <p className="text-xs text-gray-600">
        {value.mode === "manual" || (value.mode === "unchanged" && hasManual)
          ? "Lista editada en el catálogo."
          : "Por defecto se usa la lista de Servicios; al marcar o quitar modelos se guarda una lista propia."}
      </p>

      <div className="flex flex-wrap gap-2" aria-label="Modelos compatibles marcados">
        {value.labels.length === 0 && <span className="text-sm text-gray-500">Sin modelos marcados</span>}
        {value.labels.map((label) => (
          <span key={label} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-900">
            {label}
            <button type="button" aria-label={`Quitar ${label}`} onClick={() => emit(value.labels.filter((current) => current !== label))} className="font-bold leading-none">×</button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {value.labels.length > 0 && <button type="button" onClick={() => emit([])} className="rounded border px-3 py-1 text-xs">Quitar todos</button>}
        {(hasManual || value.mode === "manual") && (
          <button type="button" onClick={() => onChange({ labels: servicesLabels, mode: "services" })} className="rounded border px-3 py-1 text-xs">Usar datos de Servicios</button>
        )}
      </div>

      {full && <p role="status" className="text-sm text-amber-700">Llegaste al máximo de {MAX_MODELS} modelos: quita alguno para marcar otro.</p>}
      {state === "loading" && <p className="text-sm text-gray-500">Cargando modelos de Servicios…</p>}
      {state === "error" && (
        <p role="alert" className="text-sm text-red-700">
          {error || "No se pudo cargar el catálogo de modelos."}{" "}
          <button type="button" onClick={() => void load()} className="underline">Reintentar</button>
        </p>
      )}
      {state === "ready" && rows.length === 0 && <p className="text-sm text-gray-500">Servicios no devolvió modelos.</p>}
      {state === "ready" && rows.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">Familia
              <select value={family} onChange={(e) => { setFamily(e.target.value); setRange(""); setScreen(""); }} className={selectClass}>
                {COMPATIBLE_FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </label>
            <label className="text-sm">Gama
              <select value={activeRange} onChange={(e) => { setRange(e.target.value); setScreen(""); }} className={selectClass}>
                {ranges.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-sm">Tamaño de pantalla
              <select value={activeScreen} onChange={(e) => setScreen(e.target.value)} className={selectClass}>
                <option value="">Todos</option>
                {screens.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="grid gap-1 sm:grid-cols-2" role="group" aria-label="Modelos">
            {visible.length === 0 && <span className="text-sm text-gray-500">Sin modelos en esta selección</span>}
            {visible.map((row) => (
              <label key={row.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={selected.has(row.label.toLowerCase())} disabled={full && !selected.has(row.label.toLowerCase())} onChange={() => toggle(row.label)} />
                {row.label}
              </label>
            ))}
          </div>
        </>
      )}
    </fieldset>
  );
}
