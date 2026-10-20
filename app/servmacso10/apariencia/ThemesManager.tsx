"use client";

import React from "react";
import {
  deleteThemeAction,
  listPresetsAction,
  listThemesAction,
  saveThemeAction,
  type AdminTheme,
  type ThemePreset,
} from "./actions";
import { formatLimaDateTime } from "@/lib/lima-date";
import { CAMPAIGNS, resolveCampaign, type ThemeDesign } from "@/lib/campaigns";
import DraftPreview from "./DraftPreview";

const LAYOUT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "La de la campaña" },
  { value: "split", label: "Editorial dividida" },
  { value: "typographic", label: "Tipográfica de alto impacto" },
  { value: "arch", label: "Arco con producto" },
  { value: "spotlight", label: "Producto central en foco" },
  { value: "banded", label: "Bandas de color" },
  { value: "deals", label: "Tablero de ofertas" },
  { value: "bento", label: "Mosaico" },
  { value: "brand", label: "Marca protagonista" },
  { value: "desk", label: "Escritorio de estudio" },
  { value: "horizon", label: "Horizonte luminoso" },
  { value: "immersive", label: "Imagen a pantalla completa" },
];
const FONT_OPTIONS = [["", "La de la campaña"], ["sans", "Moderna"], ["serif", "Editorial (serifa)"], ["heavy", "Contundente (mayúsculas)"], ["mono", "Digital"]];
const TONE_OPTIONS = [["", "El de la campaña"], ["light", "Claro"], ["dark", "Oscuro"]];
const MOTIF_OPTIONS = [["", "El de la campaña"], ["none", "Ninguno"], ["ribbon", "Cinta de regalo"], ["gold", "Destellos"], ["heart", "Corazón de línea"], ["moon", "Luna"], ["andean", "Greca andina"], ["petal", "Rama floral"], ["lines", "Líneas finas"], ["grid", "Retícula digital"], ["leaf", "Hoja Macsomenos"], ["notebook", "Cuaderno"], ["sun", "Sol"]];

function emptyDesign(): ThemeDesign {
  return { layout: "", font: "", tone: "", motif: "", customColors: false, surface: "", ink: "", imageUrl: "", mobileImageUrl: "", imageX: 50, imageY: 50, eyebrow: "", headline: "", subtitle: "", ctaLabel: "", ctaUrl: "" };
}

const EFFECTS: Array<{ value: string; label: string }> = [
  { value: "none", label: "Sin efecto" },
  { value: "snow", label: "Nieve" },
  { value: "hearts", label: "Corazones" },
  { value: "confetti", label: "Confeti" },
  { value: "pumpkins", label: "Calabazas y murciélagos" },
  { value: "stars", label: "Estrellas" },
  { value: "flags", label: "Rojo y blanco" },
  { value: "flowers", label: "Flores" },
  { value: "sun", label: "Sol" },
];

const COLOR_FIELDS: Array<{ key: string; label: string }> = [
  { key: "accent", label: "Color principal" },
  { key: "accentStrong", label: "Principal (hover)" },
  { key: "accentSoft", label: "Principal suave" },
  { key: "bannerBg", label: "Fondo del aviso" },
  { key: "bannerText", label: "Texto del aviso" },
];

type Draft = {
  id: string | null;
  name: string;
  preset: string;
  mode: "scheduled" | "on" | "off";
  startsAt: string; // datetime-local en hora de Lima
  endsAt: string;
  recurringYearly: boolean;
  priority: number;
  colors: Record<string, string>;
  banner: { enabled: boolean; title: string; text: string; linkUrl: string; linkLabel: string; imageUrl: string };
  design: ThemeDesign;
  effect: string;
};

const LIMA_OFFSET_MS = -5 * 60 * 60 * 1000;

// Lima no tiene horario de verano: UTC-5 todo el año.
function toLimaInput(iso: string | null | undefined) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() + LIMA_OFFSET_MS).toISOString().slice(0, 16);
}

function fromLimaInput(value: string) {
  return value ? `${value}:00-05:00` : null;
}

function formatLima(iso: string | null) {
  return formatLimaDateTime(iso);
}

function emptyBanner() {
  return { enabled: false, title: "", text: "", linkUrl: "", linkLabel: "", imageUrl: "" };
}

function draftFromTheme(theme: AdminTheme): Draft {
  return {
    id: theme.id,
    name: theme.name,
    preset: theme.preset,
    mode: theme.mode,
    startsAt: toLimaInput(theme.starts_at),
    endsAt: toLimaInput(theme.ends_at),
    recurringYearly: theme.recurring_yearly,
    priority: theme.priority,
    colors: { ...theme.colors },
    banner: { ...emptyBanner(), ...theme.banner, enabled: Boolean(theme.banner?.enabled) } as Draft["banner"],
    design: { ...emptyDesign(), ...(theme.banner?.design || {}) },
    effect: theme.effect,
  };
}

function draftFromPreset(preset: ThemePreset): Draft {
  const hasDates = Boolean(preset.startsAt && preset.endsAt);
  return {
    id: null,
    name: preset.name,
    preset: preset.preset,
    mode: hasDates ? "scheduled" : "off",
    startsAt: toLimaInput(preset.startsAt),
    endsAt: toLimaInput(preset.endsAt),
    recurringYearly: preset.recurringYearly,
    priority: preset.preset === "black_friday" || preset.preset === "cyber_days" ? 10 : 0,
    colors: { ...preset.colors },
    banner: { ...preset.banner },
    design: emptyDesign(),
    effect: preset.effect,
  };
}

function statusOf(theme: AdminTheme, activeId: string | null) {
  if (theme.id === activeId) return { label: "Visible ahora", tone: "bg-green-100 text-green-800" };
  if (theme.mode === "off") return { label: "Desactivada", tone: "bg-gray-100 text-gray-700" };
  if (theme.mode === "on") return { label: "Forzada (otra tiene más prioridad)", tone: "bg-amber-100 text-amber-800" };
  const end = theme.ends_at ? new Date(theme.ends_at).getTime() : 0;
  if (!theme.recurring_yearly && end && end < Date.now()) return { label: "Finalizada", tone: "bg-gray-100 text-gray-700" };
  return { label: "Programada", tone: "bg-blue-100 text-blue-800" };
}

const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
const labelClass = "grid gap-1 text-sm font-medium text-gray-800";

export default function ThemesManager({
  initialThemes,
  initialActiveId,
  initialPresets,
  initialYear,
  loadError,
}: {
  initialThemes: AdminTheme[];
  initialActiveId: string | null;
  initialPresets: ThemePreset[];
  initialYear: number;
  loadError: string;
}) {
  const [themes, setThemes] = React.useState(initialThemes);
  const [activeId, setActiveId] = React.useState(initialActiveId);
  const [presets, setPresets] = React.useState(initialPresets);
  const [year, setYear] = React.useState(initialYear);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  // Copia del borrador al abrirlo, para «Restablecer cambios».
  const [original, setOriginal] = React.useState<Draft | null>(null);
  const openDraft = (next: Draft | null) => {
    setDraft(next);
    setOriginal(next ? structuredClone(next) : null);
  };
  const [choosingPreset, setChoosingPreset] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState(loadError);
  const [notice, setNotice] = React.useState("");

  const refresh = async () => {
    const result = await listThemesAction();
    if (result.ok) {
      setThemes(result.data.items);
      setActiveId(result.data.activeId);
    } else {
      setError(result.error);
    }
  };

  const changeYear = async (next: number) => {
    setYear(next);
    const result = await listPresetsAction(next);
    if (result.ok) setPresets(result.data.items);
    else setError(result.error);
  };

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    const payload = {
      name: draft.name,
      preset: draft.preset,
      mode: draft.mode,
      startsAt: fromLimaInput(draft.startsAt),
      endsAt: fromLimaInput(draft.endsAt),
      recurringYearly: draft.recurringYearly,
      priority: Number(draft.priority) || 0,
      colors: draft.colors,
      banner: { ...draft.banner, design: draft.design },
      effect: draft.effect,
    };
    const result = await saveThemeAction(draft.id, payload);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(null);
    setNotice(`Temática «${result.data.item.name}» guardada.`);
    await refresh();
  };

  const remove = async (theme: AdminTheme) => {
    if (!window.confirm(`¿Eliminar la temática «${theme.name}»? Esta acción no se puede deshacer.`)) return;
    const result = await deleteThemeAction(theme.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(`Temática «${theme.name}» eliminada.`);
    await refresh();
  };

  const quickMode = async (theme: AdminTheme, mode: AdminTheme["mode"]) => {
    const result = await saveThemeAction(theme.id, { mode });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice(mode === "on" ? `«${theme.name}» activada.` : mode === "off" ? `«${theme.name}» desactivada.` : `«${theme.name}» vuelve a sus fechas.`);
    await refresh();
  };

  const draftTheme = React.useMemo(() => draft && ({
    id: draft.id || "draft",
    name: draft.name,
    preset: draft.preset,
    colors: draft.colors,
    banner: { ...draft.banner, design: draft.design },
    effect: draft.effect,
  }), [draft]);
  const resolved = React.useMemo(() => resolveCampaign(draftTheme), [draftTheme]);
  const defaults = (CAMPAIGNS[draft?.preset || "custom"] || CAMPAIGNS.custom).copy;
  const dirty = Boolean(draft && original && JSON.stringify(draft) !== JSON.stringify(original));

  const updateDesign = (patch: Partial<ThemeDesign>) => setDraft((current) => (current ? { ...current, design: { ...current.design, ...patch } } : current));

  const uploadImage = async (file: File, target: "banner" | "imageUrl" | "mobileImageUrl" = "banner") => {
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.message || "No se pudo subir la imagen");
      const url = String(data.url);
      setDraft((current) => !current ? current : target === "banner"
        ? { ...current, banner: { ...current.banner, imageUrl: url } }
        : { ...current, design: { ...current.design, [target]: url } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} className="font-semibold">Cerrar</button>
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <span>{notice} Los visitantes lo verán en la próxima carga de la página.</span>
          <button type="button" onClick={() => setNotice("")} className="font-semibold">Cerrar</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setChoosingPreset(true)} className="min-h-11 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black">
          Nueva temática
        </button>
        <p className="text-xs text-gray-500">Las programadas se activan con hasta 5 minutos de margen. Horario: Lima.</p>
      </div>

      {themes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
          Aún no hay temáticas. Crea una a partir de una celebración (Navidad, Fiestas Patrias…) o una campaña propia.
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {themes.map((theme) => {
            const status = statusOf(theme, activeId);
            return (
              <li key={theme.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ background: theme.colors?.accent || "#2563eb" }} />
                      <h2 className="truncate font-semibold text-gray-900">{theme.name}</h2>
                    </div>
                    <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span>
                  </div>
                  <span className="shrink-0 text-xs text-gray-500">Prioridad {theme.priority}</span>
                </div>
                <dl className="mt-3 grid gap-1 text-xs text-gray-600">
                  <div>Desde: {formatLima(theme.starts_at)}</div>
                  <div>Hasta: {formatLima(theme.ends_at)}{theme.recurring_yearly ? " · se repite cada año" : ""}</div>
                  <div>Efecto: {EFFECTS.find((effect) => effect.value === theme.effect)?.label || theme.effect}</div>
                </dl>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => openDraft(draftFromTheme(theme))} className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50">Editar</button>
                  {theme.mode !== "on" && <button type="button" onClick={() => quickMode(theme, "on")} className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50">Activar ya</button>}
                  {theme.mode !== "off" && <button type="button" onClick={() => quickMode(theme, "off")} className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50">Desactivar</button>}
                  {theme.mode !== "scheduled" && theme.starts_at && theme.ends_at && (
                    <button type="button" onClick={() => quickMode(theme, "scheduled")} className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50">Usar fechas</button>
                  )}
                  <a href={`/?theme_preview=${theme.id}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50">Vista previa</a>
                  <button type="button" onClick={() => remove(theme)} className="min-h-10 rounded-lg px-3 text-sm font-medium text-red-700 hover:bg-red-50">Eliminar</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {choosingPreset && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center" onClick={() => setChoosingPreset(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="preset-title" className="flex max-h-[calc(100dvh-16px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h2 id="preset-title" className="font-semibold">Elige una celebración</h2>
              <label className="flex items-center gap-2 text-sm">Año
                <select value={year} onChange={(event) => changeYear(Number(event.target.value))} className="rounded-lg border px-2 py-1.5">
                  {[initialYear, initialYear + 1].map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
            </div>
            <ul className="grid gap-2 overflow-y-auto p-3 sm:grid-cols-2">
              {presets.map((preset) => (
                <li key={preset.preset}>
                  <button
                    type="button"
                    onClick={() => {
                      openDraft(draftFromPreset(preset));
                      setChoosingPreset(false);
                    }}
                    className="flex min-h-16 w-full items-start gap-3 rounded-xl border border-gray-200 p-3 text-left hover:border-gray-400 hover:bg-gray-50"
                  >
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full" style={{ background: preset.colors.accent }} />
                    <span>
                      <span className="block text-sm font-semibold text-gray-900">{preset.name}</span>
                      <span className="block text-xs text-gray-600">{preset.datesNote}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t px-4 py-3 text-right">
              <button type="button" onClick={() => setChoosingPreset(false)} className="min-h-10 rounded-lg border px-4 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-black/40 p-0 sm:p-3">
          <div role="dialog" aria-modal="true" aria-labelledby="theme-form-title" className="flex h-full w-full max-w-[1500px] flex-col overflow-hidden bg-white sm:rounded-2xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <h2 id="theme-form-title" className="font-semibold">{draft.id ? `Editar «${draft.name}»` : "Nueva temática"}</h2>
              <button type="button" onClick={() => !saving && setDraft(null)} className="min-h-10 rounded-lg border px-3 text-sm">Cerrar</button>
            </div>
            <form
              className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[420px_1fr] lg:overflow-hidden"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="grid min-w-0 content-start gap-4 overflow-x-hidden p-4 lg:overflow-y-auto">
                <label className={labelClass}>Nombre
                  <input className={inputClass} value={draft.name} maxLength={80} required onChange={(event) => update("name", event.target.value)} />
                </label>
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium text-gray-800">¿Cuándo se muestra?</legend>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([
                      ["scheduled", "Según fechas"],
                      ["on", "Activar ahora"],
                      ["off", "Desactivada"],
                    ] as const).map(([value, label]) => (
                      <label key={value} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm ${draft.mode === value ? "border-gray-900 bg-gray-50" : "border-gray-300"}`}>
                        <input type="radio" name="mode" checked={draft.mode === value} onChange={() => update("mode", value)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className={labelClass}>Inicio (hora de Lima)
                    <input type="datetime-local" className={inputClass} value={draft.startsAt} onChange={(event) => update("startsAt", event.target.value)} required={draft.mode === "scheduled"} />
                  </label>
                  <label className={labelClass}>Fin (hora de Lima)
                    <input type="datetime-local" className={inputClass} value={draft.endsAt} onChange={(event) => update("endsAt", event.target.value)} required={draft.mode === "scheduled"} />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" checked={draft.recurringYearly} onChange={(event) => update("recurringYearly", event.target.checked)} className="h-5 w-5" />
                    Repetir cada año
                  </label>
                  <label className={labelClass}>Prioridad (si coinciden dos)
                    <input type="number" min={-100} max={100} className={inputClass} value={draft.priority} onChange={(event) => update("priority", Number(event.target.value))} />
                  </label>
                </div>

                <fieldset className="grid gap-3 rounded-xl border border-gray-200 p-3">
                  <legend className="px-1 text-sm font-medium text-gray-800">Diseño de la portada</legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>Composición
                      <select className={inputClass} value={draft.design.layout} onChange={(event) => updateDesign({ layout: event.target.value })}>
                        {LAYOUT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className={labelClass}>Tono
                      <select className={inputClass} value={draft.design.tone} onChange={(event) => updateDesign({ tone: event.target.value })}>
                        {TONE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className={labelClass}>Letra del título
                      <select className={inputClass} value={draft.design.font} onChange={(event) => updateDesign({ font: event.target.value })}>
                        {FONT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className={labelClass}>Detalle gráfico
                      <select className={inputClass} value={draft.design.motif} onChange={(event) => updateDesign({ motif: event.target.value })}>
                        {MOTIF_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                  </div>
                  <label className={labelClass}>Texto pequeño superior
                    <input className={inputClass} maxLength={40} value={draft.design.eyebrow} placeholder={defaults.eyebrow} onChange={(event) => updateDesign({ eyebrow: event.target.value })} />
                  </label>
                  <label className={labelClass}>Título
                    <input className={inputClass} maxLength={90} value={draft.design.headline} placeholder={defaults.title} onChange={(event) => updateDesign({ headline: event.target.value })} />
                  </label>
                  <label className={labelClass}>Subtítulo
                    <textarea className={inputClass} rows={2} maxLength={200} value={draft.design.subtitle} placeholder={defaults.text} onChange={(event) => updateDesign({ subtitle: event.target.value })} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>Texto del botón
                      <input className={inputClass} maxLength={30} value={draft.design.ctaLabel} placeholder={defaults.cta} onChange={(event) => updateDesign({ ctaLabel: event.target.value })} />
                    </label>
                    <label className={labelClass}>Enlace del botón
                      <input className={inputClass} value={draft.design.ctaUrl} placeholder={defaults.ctaUrl} onChange={(event) => updateDesign({ ctaUrl: event.target.value })} />
                    </label>
                  </div>
                  <div className="grid gap-2">
                    <span className="text-sm font-medium text-gray-800">Imagen principal (opcional)</span>
                    <p className="text-xs text-gray-500">Usa fotos propias o con licencia comercial. Con «Imagen a pantalla completa» se muestra de fondo.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {(["imageUrl", "mobileImageUrl"] as const).map((key) => (
                        <span key={key} className="flex items-center gap-1">
                          <label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-gray-300 px-3 text-sm">
                            {uploading ? "Subiendo…" : key === "imageUrl" ? "Subir imagen" : "Imagen para móvil"}
                            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file, key); event.target.value = ""; }} />
                          </label>
                          {draft.design[key] && <button type="button" className="min-h-10 rounded-lg px-2 text-sm text-red-700" onClick={() => updateDesign({ [key]: "" })}>Quitar</button>}
                        </span>
                      ))}
                    </div>
                    {(draft.design.imageUrl || draft.banner.imageUrl) && (
                      <div className="grid gap-2">
                        <div className="grid grid-cols-[1fr_auto] items-end gap-3">
                          <div className="grid gap-1">
                            <span className="text-xs text-gray-600">Recorte en escritorio</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={draft.design.imageUrl || draft.banner.imageUrl} alt="" className="aspect-[16/7] w-full rounded-lg object-cover" style={{ objectPosition: `${draft.design.imageX}% ${draft.design.imageY}%` }} />
                          </div>
                          <div className="grid gap-1">
                            <span className="text-xs text-gray-600">En móvil</span>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={draft.design.mobileImageUrl || draft.design.imageUrl || draft.banner.imageUrl} alt="" className="aspect-[3/4] w-20 rounded-lg object-cover" style={{ objectPosition: `${draft.design.imageX}% ${draft.design.imageY}%` }} />
                          </div>
                        </div>
                        <label className="grid gap-1 text-xs text-gray-700">Encuadre horizontal ({draft.design.imageX}%)
                          <input type="range" min={0} max={100} value={draft.design.imageX} onChange={(event) => updateDesign({ imageX: Number(event.target.value) })} />
                        </label>
                        <label className="grid gap-1 text-xs text-gray-700">Encuadre vertical ({draft.design.imageY}%)
                          <input type="range" min={0} max={100} value={draft.design.imageY} onChange={(event) => updateDesign({ imageY: Number(event.target.value) })} />
                        </label>
                      </div>
                    )}
                  </div>
                </fieldset>

                <fieldset className="grid gap-2 rounded-xl border border-gray-200 p-3">
                  <legend className="px-1 text-sm font-medium text-gray-800">Colores</legend>
                  {draft.preset !== "custom" && (
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input type="checkbox" className="h-5 w-5" checked={draft.design.customColors} onChange={(event) => updateDesign({ customColors: event.target.checked })} />
                      Usar mis colores en lugar de los de la campaña
                    </label>
                  )}
                  {(draft.preset === "custom" || draft.design.customColors) && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        {COLOR_FIELDS.map((field) => (
                          <label key={field.key} className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-2 text-xs">
                            <input type="color" value={draft.colors[field.key] || "#2563eb"} onChange={(event) => update("colors", { ...draft.colors, [field.key]: event.target.value })} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" />
                            {field.label}
                          </label>
                        ))}
                        {([["surface", "Fondo de la portada"], ["ink", "Texto de la portada"]] as const).map(([key, label]) => (
                          <label key={key} className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-2 text-xs">
                            <input type="color" value={draft.design[key] || resolved?.palette[key === "surface" ? "bg" : "ink"] || "#ffffff"} onChange={(event) => updateDesign({ [key]: event.target.value })} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" />
                            {label}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">Si un color no se lee bien, la web lo ajusta sola para cumplir el contraste mínimo (WCAG AA).</p>
                    </>
                  )}
                </fieldset>

                <label className={labelClass}>Efecto decorativo
                  <select className={inputClass} value={draft.effect} onChange={(event) => update("effect", event.target.value)}>
                    {EFFECTS.map((effect) => <option key={effect.value} value={effect.value}>{effect.label}</option>)}
                  </select>
                  <span className="text-xs font-normal text-gray-500">Recomendado: sin efecto. Si lo usas, es discreto y se desactiva con «reducir movimiento».</span>
                </label>

                <fieldset className="grid gap-3 rounded-xl border border-gray-200 p-3">
                  <legend className="px-1 text-sm font-medium text-gray-800">Aviso superior</legend>
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" className="h-5 w-5" checked={draft.banner.enabled} onChange={(event) => update("banner", { ...draft.banner, enabled: event.target.checked })} />
                    Mostrar aviso arriba de la página
                  </label>
                  <label className={labelClass}>Título
                    <input className={inputClass} maxLength={80} value={draft.banner.title} onChange={(event) => update("banner", { ...draft.banner, title: event.target.value })} />
                  </label>
                  <label className={labelClass}>Mensaje
                    <input className={inputClass} maxLength={200} value={draft.banner.text} onChange={(event) => update("banner", { ...draft.banner, text: event.target.value })} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClass}>Enlace (p. ej. /categorias)
                      <input className={inputClass} value={draft.banner.linkUrl} onChange={(event) => update("banner", { ...draft.banner, linkUrl: event.target.value })} placeholder="/c/iphone" />
                    </label>
                    <label className={labelClass}>Texto del enlace
                      <input className={inputClass} maxLength={30} value={draft.banner.linkLabel} onChange={(event) => update("banner", { ...draft.banner, linkLabel: event.target.value })} placeholder="Ver equipos" />
                    </label>
                  </div>
                </fieldset>
              </div>

              <div className="flex min-h-[560px] flex-col border-t p-4 lg:min-h-0 lg:border-l lg:border-t-0">
                <DraftPreview theme={draftTheme} />
              </div>

              <div className="sticky bottom-0 flex flex-wrap gap-2 border-t bg-white px-4 py-3 lg:col-span-2">
                <button type="button" onClick={() => setDraft(null)} disabled={saving} className="min-h-11 flex-1 rounded-lg border px-4 text-sm sm:flex-none">Cancelar</button>
                <button type="button" onClick={() => original && setDraft(structuredClone(original))} disabled={saving || !dirty} className="min-h-11 flex-1 rounded-lg border px-4 text-sm disabled:opacity-50 sm:flex-none">Restablecer cambios</button>
                <span className="hidden flex-1 self-center text-xs text-gray-500 sm:block">{dirty ? "Cambios sin guardar: solo se ven en esta vista previa." : "Sin cambios."}</span>
                <button type="submit" disabled={saving || uploading} className="min-h-11 flex-1 rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white disabled:opacity-60 sm:flex-none">
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
