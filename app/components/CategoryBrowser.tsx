"use client";
import Link from "next/link";
import React from "react";
import dynamic from "next/dynamic";
import CatalogProductCard, { CATALOG_GRID_CLASS } from "./CatalogProductCard";
import { catalogFacts, compactSpecs, detailCountLabel, formatRam } from "@/lib/catalog-display";
import { catalogPrice, withIgv } from "@/lib/catalog-price";
import { matchScore, matchesTerms, searchTerms, searchableText } from "@/lib/catalog-search";
import { trackCatalogEvent } from "@/lib/analytics";
import { whatsappUrl } from "@/lib/store-config";

type Row = any;

const CompareDialog = dynamic(() => import("./CompareDialog"), { ssr: false, loading: () => <div role="status" className="fixed bottom-24 right-4 z-50 rounded-full bg-white px-5 py-3 text-sm shadow-lg">Abriendo comparador…</div> });

function parseNotes(row: Row) {
  try {
    const n = row?.staged?.notes && typeof row.staged.notes === "string" ? JSON.parse(row.staged.notes) : row?.staged?.notes || {};
    const specs = (n?.specs || n) as any;
    const d = (specs?.detalle || {}) as any;
    const size = d["tamaño"] || d.tamanio || d.tamano || "";
    const title = String(row?.product?.title || row?.staged?.title || row?.title || "");
    const resolvedSize = size || n?.watchSize || title.match(/\b(4[0-9])\s*mm\b/i)?.[1] || "";
    const proc = d.procesador || "";
    const ram = d.ram || "";
    const storage = d.almacenamiento || d.ssd || row?.product?.storage_gb || row?.staged?.storage_gb || n?.storageGb || n?.storage || "";
    const gama = d.gama || row?.product?.iphone_model || row?.staged?.iphone_model || n?.iphoneModel || "";
    const connectivity = d.conectividad || n?.conectividad || n?.watchConnection || "";
    const watchType = String(n?.watchType || "").trim();
    const watchVersion = String(n?.watchVersion || "").trim();
    const watchSeries = String(n?.watchSeries || "").trim();
    return { notes: n, specs, d, size: String(resolvedSize), proc: String(proc), ram: String(ram), storage: String(storage), tipo: String(gama), connectivity: String(connectivity), watchType, watchVersion, watchSeries, title };
  } catch {
    return { notes: {}, specs: {}, d: {}, size: "", proc: "", ram: "", storage: "", tipo: "", connectivity: "", watchType: "", watchVersion: "", watchSeries: "", title: "" };
  }
}

function priceMeta(row: Row) {
  const { price, compareAt, saleType, promoLabel } = catalogPrice(row);
  const notes = parseNotes(row).notes as any;
  const condition = String(row?.product?.product_condition || row?.staged?.product_condition || notes?.productCondition || notes?.estado || "");
  return { price, compareAt, condition, saleType, promoLabel };
}

function dedupe<T>(arr: T[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function normalizeStorage(value: unknown) {
  const raw = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  if (!raw) return "";
  if (/^\d+$/.test(raw)) {
    const n = Number(raw);
    if (n >= 1024 && n % 1024 === 0) return `${n / 1024}TB`;
    return `${n}GB`;
  }
  return raw;
}

function normalizeConnectivity(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/wifi.*(cellular|celular)|cellular|celular/i.test(raw)) {
    return /wifi/i.test(raw) ? "WiFi + Celular" : "GPS + Celular";
  }
  if (/wifi/i.test(raw)) return "WiFi";
  if (/gps/i.test(raw)) return "GPS";
  return raw;
}

function normalizeIphoneModel(value: unknown, title: string) {
  const raw = String(value || "").trim();
  const source = `${raw} ${title}`;
  if (/pro\s*max/i.test(source)) return "Pro Max";
  if (/\bpro\b/i.test(source)) return "Pro";
  if (/\bplus\b/i.test(source)) return "Plus";
  if (/\bmini\b/i.test(source)) return "Mini";
  if (/\bnormal\b/i.test(source)) return "Normal";
  return raw;
}

function normalizeWatchSeries(meta: any) {
  const title = String(meta.title || meta.row?.product?.title || meta.row?.staged?.title || "");
  const type = String(meta.watchType || "").trim();
  const version = String(meta.watchVersion || "").trim();
  const series = String(meta.watchSeries || "").trim();
  if (/ultra/i.test(type) || /\bultra\b/i.test(title)) {
    const fromTitle = title.match(/\bultra\s*(\d)?\b/i)?.[1] || "";
    const v = version || fromTitle;
    return v && v !== "1" ? `Ultra ${v}` : "Ultra";
  }
  const fromTitle = title.match(/\bseries\s*(\d{1,2})\b/i)?.[1] || title.match(/\bserie\s*(\d{1,2})\b/i)?.[1] || "";
  const value = series || fromTitle;
  return value ? `Serie ${value}` : "";
}

function iphoneNumberOf(row: Row) {
  const notes = parseNotes(row).notes as any;
  const value = row?.product?.iphone_number ?? row?.staged?.iphone_number ?? notes?.iphoneNumber ?? "";
  return String(value || "").trim() || String(row?.product?.title || row?.staged?.title || "").match(/\biPhone\s+(\d{1,2})\b/i)?.[1] || "";
}

function numericRank(value: string) {
  const n = Number(String(value).match(/\d+(?:\.\d+)?/)?.[0] || Number.POSITIVE_INFINITY);
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
}

function storageRank(value: string) {
  const raw = String(value || "").toUpperCase();
  const n = Number(raw.match(/\d+(?:\.\d+)?/)?.[0] || 0);
  return /TB/.test(raw) ? n * 1024 : n;
}

function sortGama(values: string[], category: string) {
  const iphoneOrder = ["Normal", "Mini", "Plus", "Pro", "Pro Max"];
  const macbookOrder = ["Air", "Pro", "Neo"];
  const ipadOrder = ["Normal", "Mini", "Air", "Pro"];
  const order = category === "iphone" ? iphoneOrder : category === "macbook" ? macbookOrder : ipadOrder;
  return [...values].sort((a, b) => {
    const ai = order.findIndex((v) => v.toLowerCase() === a.toLowerCase());
    const bi = order.findIndex((v) => v.toLowerCase() === b.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
}

function sortSeries(values: string[]) {
  return [...values].sort((a, b) => {
    const aUltra = /^ultra/i.test(a);
    const bUltra = /^ultra/i.test(b);
    if (aUltra !== bUltra) return aUltra ? 1 : -1;
    return numericRank(a) - numericRank(b) || a.localeCompare(b);
  });
}

function promoRank(item: any) {
  const saleType = String(item.saleType || "").toUpperCase();
  const compareAt = Number(item.compareAt || 0);
  const price = Number(item.price || 0);
  const hasSavings = compareAt > price && price > 0;
  return saleType === "PROMOCION" || hasSavings ? 1 : 0;
}

function isNewCondition(condition: unknown) {
  return String(condition || "").toLowerCase().includes("nuevo");
}

type FacetKey = "category" | "model" | "tipo" | "proc" | "size" | "ram" | "ssd" | "connectivity" | "series" | "condition" | "color";

type Facet = {
  key: FacetKey;
  title: string;
  /** Parámetro de la URL. */
  param: string;
  valueOf: (m: any) => string;
  label?: (value: string) => string;
  sort?: (values: string[]) => string[];
};

const titleOf = (m: any) => String(m.row?.product?.title || m.row?.staged?.title || m.title || "");
const colorOf = (m: any) => String(m.row?.product?.color || m.row?.staged?.color || m.notes?.color || "").trim();

// Filtros de cada categoría, en el orden en que se muestran. Los primeros
// (`OPEN_FACETS`) aparecen abiertos; el resto queda en acordeones.
function facetsFor(category: string): Facet[] {
  const isIphone = category === "iphone";
  const isIpad = category === "ipad";
  const isMacbook = category === "macbook";
  const isWatch = category === "watch";
  const gama = (m: any) => {
    const title = titleOf(m);
    const raw = isIphone ? normalizeIphoneModel(m.tipo, title)
      : isIpad ? String(m.tipo || title.match(/\biPad\s+(Mini|Air|Pro)\b/i)?.[1] || "")
      : isMacbook ? String(m.tipo || title.match(/\b(Air|Pro|Neo)\b/i)?.[1] || "")
      : String(m.tipo || "").trim();
    return raw.replace(/\bmac\s*book\s*/i, "").trim();
  };
  const facet = {
    category: { key: "category", title: "Categoría", param: "category", valueOf: (m: any) => String(m.row.category || "").trim(), label: (v: string) => (v === "watch" ? "Apple Watch" : v === "otros" ? "Otros" : v === "iphone" ? "iPhone" : v === "ipad" ? "iPad" : v === "macbook" ? "MacBook" : v) },
    model: { key: "model", title: "Modelo", param: "model", valueOf: (m: any) => iphoneNumberOf(m.row), label: (v: string) => `iPhone ${v}`, sort: (vs: string[]) => [...vs].sort((a, b) => numericRank(a) - numericRank(b)) },
    tipo: { key: "tipo", title: isIphone ? "Versión" : isIpad ? "Modelo" : "Gama", param: "gama", valueOf: gama, sort: (vs: string[]) => sortGama(vs, category) },
    proc: { key: "proc", title: "Procesador", param: "chip", valueOf: (m: any) => String(m.proc || titleOf(m).match(/\bM[0-9][a-z0-9 ]*?(?:Pro|Max|Ultra)?\b/i)?.[0] || "").trim(), sort: (vs: string[]) => [...vs].sort((a, b) => a.localeCompare(b, "es", { numeric: true })) },
    size: { key: "size", title: isWatch ? "Tamaño" : "Pantalla", param: "size", valueOf: (m: any) => String(m.size || titleOf(m).match(/\b(1[0-9](?:\.[0-9])?|4[0-9])\b/)?.[1] || "").replace(/\s*mm$/i, "").replace(/"$/, "").trim(), label: (v: string) => (isWatch ? `${v} mm` : `${v}"`), sort: (vs: string[]) => [...vs].sort((a, b) => numericRank(a) - numericRank(b)) },
    ram: { key: "ram", title: "RAM", param: "ram", valueOf: (m: any) => formatRam(m.ram), sort: (vs: string[]) => [...vs].sort((a, b) => numericRank(a) - numericRank(b)) },
    ssd: { key: "ssd", title: isMacbook ? "SSD" : "Capacidad", param: "storage", valueOf: (m: any) => normalizeStorage(m.storage || titleOf(m).match(/\b(\d+\s*(?:GB|TB))\b/i)?.[1] || ""), label: (v: string) => v.replace(/(\d)(GB|TB)/, "$1 $2"), sort: (vs: string[]) => [...vs].sort((a, b) => storageRank(a) - storageRank(b)) },
    connectivity: { key: "connectivity", title: "Conectividad", param: "connectivity", valueOf: (m: any) => normalizeConnectivity(m.connectivity || titleOf(m)) },
    series: { key: "series", title: "Serie", param: "series", valueOf: (m: any) => normalizeWatchSeries(m), sort: sortSeries },
    condition: { key: "condition", title: "Condición", param: "condition", valueOf: (m: any) => String(m.condition || "").trim(), sort: (vs: string[]) => [...vs].sort((a, b) => CONDITION_ORDER.indexOf(a) - CONDITION_ORDER.indexOf(b)) },
    color: { key: "color", title: "Color", param: "color", valueOf: colorOf, sort: (vs: string[]) => [...vs].sort((a, b) => a.localeCompare(b, "es")) },
  } satisfies Record<FacetKey, Facet>;
  if (isMacbook) return [facet.tipo, facet.proc, facet.size, facet.ram, facet.ssd, facet.condition, facet.color];
  if (isIphone) return [facet.model, facet.ssd, facet.condition, facet.color, facet.tipo];
  if (isIpad) return [facet.tipo, facet.size, facet.ssd, facet.connectivity, facet.condition, facet.proc, facet.color];
  if (isWatch) return [facet.series, facet.size, facet.connectivity, facet.condition, facet.color];
  if (category === "otros") return [facet.condition, facet.color];
  // Búsqueda y ofertas: varias categorías mezcladas.
  return [facet.category, facet.condition];
}

const CONDITION_ORDER = ["Nuevo", "Open Box", "Usado", "Arreglado"];
const OPEN_FACETS = 4;

type Selection = Record<FacetKey, string[]>;
const EMPTY_SELECTION: Selection = { category: [], model: [], tipo: [], proc: [], size: [], ram: [], ssd: [], connectivity: [], series: [], condition: [], color: [] };

function FilterGroup({
  facet,
  options,
  selected,
  onToggle,
  defaultOpen,
}: {
  facet: Facet;
  options: Array<{ value: string; count: number }>;
  selected: string[];
  onToggle: (value: string) => void;
  defaultOpen: boolean;
}) {
  // Un filtro con una sola opción no ayuda a elegir; se muestra solo si ya está aplicado.
  if (!options.length || (options.length < 2 && !selected.length)) return null;
  const titleId = `filter-${facet.key}`;
  return (
    <details open={defaultOpen || selected.length > 0} className="group border-b border-[color:var(--border)] py-1 last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-[15px] font-semibold text-[color:var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] [&::-webkit-details-marker]:hidden">
        <span id={titleId}>
          {facet.title}
          {selected.length > 0 && <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--accent)] px-1.5 text-[11px] font-bold text-white">{selected.length}</span>}
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-[color:var(--foreground-soft)] transition-transform group-open:rotate-180"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <div role="group" aria-labelledby={titleId} className="flex flex-wrap gap-2 pb-4 pt-1">
        {options.map(({ value, count }) => {
          const active = selected.includes(value);
          const impossible = count === 0 && !active;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              disabled={impossible}
              onClick={() => onToggle(value)}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-sm transition-colors ${
                active
                  ? "border-[color:var(--accent)] bg-[color:var(--brand-tint)] font-semibold text-[color:var(--accent-strong)]"
                  : impossible
                    ? "cursor-not-allowed border-dashed border-[color:var(--border)] text-[color:var(--foreground-soft)]/60"
                    : "border-[color:var(--border-strong)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
              }`}
            >
              <span>{facet.label ? facet.label(value) : value}</span>
              <span className={`text-xs tabular-nums ${active ? "text-[color:var(--accent-strong)]" : "text-[color:var(--foreground-soft)]"}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
}

const SORT_OPTIONS = [
  ["none", "Recomendados"],
  ["price_asc", "Menor precio"],
  ["price_desc", "Mayor precio"],
  ["recent", "Más recientes"],
  ["discount", "Mayor descuento"],
] as const;
type SortKey = (typeof SORT_OPTIONS)[number][0];

const BATTERY_STEPS = ["80", "90", "95"];

/** Precio sin IGV escrito por el cliente: admite «3,500.50» o «3500,5». */
function parseAmount(value: string) {
  const raw = String(value || "").trim().replace(/\s|S\/?/gi, "");
  if (!raw) return null;
  const normalized = /,\d{1,2}$/.test(raw) && !raw.includes(".") ? raw.replace(",", ".") : raw.replace(/,/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const money = (value: number) => value.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function discountRatio(m: any) {
  const compareAt = Number(m.compareAt || 0);
  const price = Number(m.price || 0);
  return compareAt > price && price > 0 ? (compareAt - price) / compareAt : 0;
}

export default function CategoryBrowser({ initialItems, category, initialQuery = "", autoFocusSearch = false }: { initialItems: Row[]; category?: string; initialQuery?: string; autoFocusSearch?: boolean }) {
  const normalizedCategory = String(category || "").toLowerCase();
  const isIphone = normalizedCategory === "iphone";
  const isMacbook = normalizedCategory === "macbook";
  const isIpad = normalizedCategory === "ipad";
  const isWatch = normalizedCategory === "watch";
  const facets = React.useMemo(() => facetsFor(normalizedCategory), [normalizedCategory]);
  const [selection, setSelection] = React.useState<Selection>(EMPTY_SELECTION);
  const [batteryMinimum, setBatteryMinimum] = React.useState<string>("");
  const [sort, setSort] = React.useState<SortKey>("none");
  const [availability, setAvailability] = React.useState<"all" | "warehouse" | "preorder">("all");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [urlReady, setUrlReady] = React.useState(false);
  const [search, setSearch] = React.useState(initialQuery);
  // Precio SIN IGV: texto tal como lo escribe el cliente; vacío = sin límite.
  const [minPrice, setMinPrice] = React.useState("");
  const [maxPrice, setMaxPrice] = React.useState("");
  const [compareSlugs, setCompareSlugs] = React.useState<string[]>([]);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const closeCompare = React.useCallback(() => setCompareOpen(false), []);
  React.useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("macsomenos:compare") || "[]");
      if (Array.isArray(stored)) setCompareSlugs(stored.filter((slug): slug is string => typeof slug === "string").slice(0, 3));
    } catch { /* An unavailable store must not block the catalog. */ }
  }, []);
  const toggleCompare = (slug: string) => {
    trackCatalogEvent("compare_product", { product_slug: slug, selected: !compareSlugs.includes(slug) });
    setCompareSlugs((current) => {
      const next = current.includes(slug) ? current.filter((value) => value !== slug) : current.length < 3 ? [...current, slug] : current;
      try { window.localStorage.setItem("macsomenos:compare", JSON.stringify(next)); } catch { /* Private browsing can disable storage. */ }
      return next;
    });
  };
  const clearCompare = () => {
    setCompareSlugs([]);
    setCompareOpen(false);
    try { window.localStorage.removeItem("macsomenos:compare"); } catch { /* Storage may be disabled. */ }
  };
  // El foco automático solo en escritorio: en un teléfono abriría el teclado y taparía los resultados.
  const searchRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (autoFocusSearch && !initialQuery && window.matchMedia("(pointer: fine)").matches) searchRef.current?.focus();
  }, [autoFocusSearch, initialQuery]);
  const deferredSearch = React.useDeferredValue(searchTerms(search).join(" "));
  React.useEffect(() => { if (normalizedCategory) trackCatalogEvent("view_category", { category: normalizedCategory }); }, [normalizedCategory]);
  const filtersButtonRef = React.useRef<HTMLButtonElement>(null);
  const filtersCloseRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!filtersOpen) return;
    const returnFocusTo = filtersButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    filtersCloseRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setFiltersOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      returnFocusTo?.focus();
    };
  }, [filtersOpen]);

  const meta = React.useMemo(
    () =>
      initialItems
        // El backend ya excluye lo no vendible; aquí se repite por seguridad: nada
        // vendido, reservado o sin stock aparece en el catálogo público.
        .filter((row) => row?.product?.status !== "sold" && row?.staged?.status !== "sold" && row?.availability !== "sold" && row?.availability !== "reserved" && Number(row?.product?.stock ?? row?.staged?.stock ?? 1) > 0)
        .map((row) => ({ row, ...priceMeta(row), ...parseNotes(row), ...catalogFacts(row), searchText: searchableText(row) })),
    [initialItems]
  );

  // Límites exactos del precio vigente SIN IGV (promociones incluidas), sin redondear.
  const prices = React.useMemo(() => meta.map((m) => Number(m.price)).filter((n) => Number.isFinite(n) && n >= 0), [meta]);
  const minGlobal = prices.length ? Math.min(...prices) : 0;
  const maxGlobal = prices.length ? Math.max(...prices) : 0;
  const minBound = parseAmount(minPrice);
  const maxBound = parseAmount(maxPrice);
  const lowV = minBound !== null && maxBound !== null ? Math.min(minBound, maxBound) : minBound;
  const highV = minBound !== null && maxBound !== null ? Math.max(minBound, maxBound) : maxBound;

  React.useEffect(() => {
    const restore = () => {
      const params = new URLSearchParams(window.location.search);
      const values = (key: string) => params.getAll(key).filter(Boolean);
      setSearch(params.get("q") ?? initialQuery);
      const next = { ...EMPTY_SELECTION };
      for (const facet of facetsFor(normalizedCategory)) next[facet.key] = values(facet.param);
      setSelection(next);
      setBatteryMinimum(params.get("battery") || "");
      const nextSort = params.get("sort");
      setSort(SORT_OPTIONS.some(([value]) => value === nextSort) ? nextSort as SortKey : "none");
      const nextAvailability = params.get("availability");
      setAvailability(nextAvailability === "warehouse" || nextAvailability === "preorder" ? nextAvailability : "all");
      setMinPrice(params.get("min") || "");
      setMaxPrice(params.get("max") || "");
      setUrlReady(true);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  // Only restore on navigation; filter changes are written below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedCategory]);
  const lastSearchRef = React.useRef(search);
  React.useEffect(() => {
    if (!urlReady) return;
    const write = () => {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (sort !== "none") params.set("sort", sort);
      if (availability !== "all") params.set("availability", availability);
      if (lowV !== null) params.set("min", String(lowV));
      if (highV !== null) params.set("max", String(highV));
      if (batteryMinimum) params.set("battery", batteryMinimum);
      for (const facet of facets) selection[facet.key].forEach((value) => params.append(facet.param, value));
      const next = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`;
      if (`${window.location.pathname}${window.location.search}` !== next) window.history.replaceState(window.history.state, "", next);
    };
    // Solo el texto de búsqueda espera a que el cliente deje de escribir. Los
    // demás filtros se escriben al instante: si abre una ficha enseguida, al
    // volver encuentra exactamente los filtros que tenía.
    const typing = lastSearchRef.current !== search;
    lastSearchRef.current = search;
    if (!typing) { write(); return; }
    const timer = window.setTimeout(write, 250);
    return () => window.clearTimeout(timer);
  }, [urlReady, search, sort, availability, lowV, highV, batteryMinimum, selection, facets]);

  const isPreorder = (m: any) => String(m.saleType || "").toUpperCase() === "PREVENTA";
  const inStock = (m: any) => Number(m.row.product?.stock ?? m.row.staged?.stock ?? 0) > 0;
  const batteryApplies = (isIphone || isMacbook || isIpad || isWatch) && meta.some((item) => Number(item.batteryHealth) > 0);

  // Todo lo que no es una faceta: búsqueda, disponibilidad, precio y batería.
  const baseMeta = React.useMemo(() => {
    let arr = meta;
    if (lowV !== null) arr = arr.filter((m) => Number(m.price) >= lowV);
    if (highV !== null) arr = arr.filter((m) => Number(m.price) <= highV);
    if (deferredSearch) {
      const terms = deferredSearch.split(" ").filter(Boolean);
      arr = arr.filter((m) => matchesTerms(m.searchText, terms));
    }
    if (availability === "warehouse") arr = arr.filter((m) => !isPreorder(m) && inStock(m));
    if (availability === "preorder") arr = arr.filter((m) => isPreorder(m) && inStock(m));
    if (batteryMinimum) arr = arr.filter((m) => Number(m.batteryHealth) >= Number(batteryMinimum));
    return arr;
  // isPreorder/inStock are pure helpers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, lowV, highV, deferredSearch, availability, batteryMinimum]);

  const matchesFacets = React.useCallback((m: any, skip?: FacetKey) => facets.every((facet) => {
    if (facet.key === skip) return true;
    const chosen = selection[facet.key];
    return !chosen.length || chosen.includes(facet.valueOf(m));
  }), [facets, selection]);

  // Opciones con su número de resultados aplicando los DEMÁS filtros: una
  // opción que no puede dar resultados se muestra deshabilitada.
  const facetOptions = React.useMemo(() => {
    const out = {} as Record<FacetKey, Array<{ value: string; count: number }>>;
    for (const facet of facets) {
      const all = dedupe(meta.map((m) => facet.valueOf(m)).filter(Boolean));
      const sorted = facet.sort ? facet.sort(all) : all;
      const pool = baseMeta.filter((m) => matchesFacets(m, facet.key));
      out[facet.key] = sorted.map((value) => ({ value, count: pool.filter((m) => facet.valueOf(m) === value).length }));
    }
    return out;
  }, [facets, meta, baseMeta, matchesFacets]);

  const filteredMeta = React.useMemo(() => {
    let arr = baseMeta.filter((m) => matchesFacets(m));
    const bySlug = (a: any, b: any) => String(a.row.slug).localeCompare(String(b.row.slug));
    if (sort === "price_asc") arr = [...arr].sort((a, b) => a.price - b.price || bySlug(a, b));
    if (sort === "price_desc") arr = [...arr].sort((a, b) => b.price - a.price || bySlug(a, b));
    if (sort === "recent") arr = [...arr].sort((a, b) => new Date(b.row.createdAt || 0).getTime() - new Date(a.row.createdAt || 0).getTime() || bySlug(a, b));
    if (sort === "discount") arr = [...arr].sort((a, b) => discountRatio(b) - discountRatio(a) || a.price - b.price);
    if (sort === "none") arr = [...arr].sort((a, b) => promoRank(b) - promoRank(a));
    return arr;
  }, [baseMeta, matchesFacets, sort]);

  const hasDiscounts = React.useMemo(() => meta.some((m) => discountRatio(m) > 0), [meta]);
  const sortOptions = SORT_OPTIONS.filter(([value]) => value !== "discount" || hasDiscounts);

  const availabilityCounts = React.useMemo(() => ({
    all: meta.length,
    warehouse: meta.filter((m) => !isPreorder(m) && inStock(m)).length,
    preorder: meta.filter((m) => isPreorder(m) && inStock(m)).length,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [meta]);

  // Sin resultados: equipos que cumplen parte de la búsqueda, para no dejar
  // al cliente frente a una pantalla vacía.
  const closeMatches = React.useMemo(() => {
    if (filteredMeta.length || !deferredSearch) return [];
    const terms = deferredSearch.split(" ").filter(Boolean);
    // Si la búsqueda nombra una categoría («iphone 15»), solo se sugieren
    // equipos de esa categoría: un MacBook de 15" no es un iPhone 15.
    const namedCategory = ["macbook", "iphone", "ipad", "watch"].find((key) => terms.includes(key));
    return meta
      .filter((m) => !namedCategory || String(m.row?.category || "").toLowerCase() === namedCategory)
      .map((m) => ({ m, score: matchScore(m.searchText, terms) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.m.price - b.m.price)
      .slice(0, 4)
      .map((entry) => entry.m);
  }, [deferredSearch, filteredMeta.length, meta]);

  // Búsqueda: texto (sin datos personales) y cuántos resultados obtuvo, para
  // detectar lo que los clientes buscan y no encuentran.
  const searchResults = filteredMeta.length;
  React.useEffect(() => {
    if (!urlReady || !deferredSearch) return;
    const timer = window.setTimeout(() => trackCatalogEvent("search_product", { category: normalizedCategory, query: deferredSearch.slice(0, 80), results: searchResults }), 900);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, deferredSearch, normalizedCategory]);

  const toggleFacet = (key: FacetKey, value: string) => {
    setSelection((current) => ({ ...current, [key]: current[key].includes(value) ? current[key].filter((v) => v !== value) : [...current[key], value] }));
  };
  const clearPrice = () => { setMinPrice(""); setMaxPrice(""); };
  const activeFilterChips: Array<{ key: string; label: string; remove: () => void }> = [
    ...(availability !== "all" ? [{ key: "availability", label: availability === "warehouse" ? "En almacén" : "Preventa", remove: () => setAvailability("all") }] : []),
    ...(lowV !== null || highV !== null ? [{
      key: "price",
      label: lowV !== null && highV !== null ? `Precio: S/ ${money(lowV)} – S/ ${money(highV)}` : lowV !== null ? `Precio desde S/ ${money(lowV)}` : `Precio hasta S/ ${money(highV ?? 0)}`,
      remove: clearPrice,
    }] : []),
    ...facets.flatMap((facet) => selection[facet.key].map((value) => ({
      key: `${facet.key}-${value}`,
      label: facet.label ? facet.label(value) : value,
      remove: () => toggleFacet(facet.key, value),
    }))),
    ...(batteryMinimum ? [{ key: "battery", label: `Batería desde ${batteryMinimum}%`, remove: () => setBatteryMinimum("") }] : []),
  ];
  const activeFilters = activeFilterChips.map((chip) => chip.label);
  const filterSignature = JSON.stringify([availability, selection, batteryMinimum, lowV, highV, sort]);
  const previousFilterSignature = React.useRef("");
  React.useEffect(() => {
    if (!urlReady) return;
    if (previousFilterSignature.current && previousFilterSignature.current !== filterSignature) {
      trackCatalogEvent("apply_filter", { category: normalizedCategory, filter_count: activeFilters.length, filters: activeFilters.slice(0, 20) });
    }
    previousFilterSignature.current = filterSignature;
  // The signature captures all filter state; the count is derived from it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, filterSignature, normalizedCategory]);

  // Deslizador: posición proporcional entre los límites exactos. Los extremos
  // equivalen a «sin límite», así el filtro nunca recorta por redondeo.
  const span = Math.max(maxGlobal - minGlobal, 0.01);
  const toPercent = (v: number) => Math.max(0, Math.min(100, ((v - minGlobal) / span) * 100));
  const fromPercent = (pct: number) => Math.round(minGlobal + (pct / 100) * span);
  const priceMinPercent = lowV === null ? 0 : toPercent(lowV);
  const priceMaxPercent = highV === null ? 100 : toPercent(highV);
  const setMinFromPercent = (pct: number) => {
    const limit = highV === null ? 100 : priceMaxPercent;
    const next = Math.min(pct, limit);
    setMinPrice(next <= 0 ? "" : String(fromPercent(next)));
  };
  const setMaxFromPercent = (pct: number) => {
    const next = Math.max(pct, priceMinPercent);
    setMaxPrice(next >= 100 ? "" : String(fromPercent(next)));
  };

  const resetFilters = () => {
    setSelection(EMPTY_SELECTION);
    setBatteryMinimum("");
    setAvailability("all");
    setSort("none");
    clearPrice();
  };

  // Filtro rápido en móvil: la primera faceta de la categoría (gama, modelo o serie).
  const quickFacet = normalizedCategory && normalizedCategory !== "otros" ? facets[0] : null;
  const quickOptions = quickFacet ? facetOptions[quickFacet.key].filter((option) => option.count > 0 || selection[quickFacet.key].includes(option.value)) : [];
  const resultsLabel = `${filteredMeta.length} ${filteredMeta.length === 1 ? "equipo" : "equipos"}`;

  return (
    <div className={`mt-5 grid gap-6 sm:mt-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-8 ${compareSlugs.length ? "pb-40 sm:pb-32" : ""}`}>
      {filtersOpen && <button type="button" aria-label="Cerrar filtros" onClick={() => setFiltersOpen(false)} className="ms-scrim fixed inset-0 z-[59] bg-[rgba(14,20,32,0.45)] lg:hidden" />}
      <aside
        id="catalog-filters"
        role={filtersOpen ? "dialog" : undefined}
        aria-modal={filtersOpen ? "true" : undefined}
        aria-labelledby="catalog-filters-title"
        className={`${filtersOpen ? "ms-sheet fixed inset-x-0 bottom-0 z-[60] flex max-h-[90svh] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:rounded-none" : "hidden"} lg:static lg:order-1 lg:block lg:max-h-none lg:w-auto lg:overflow-visible lg:rounded-none lg:bg-transparent lg:shadow-none`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--border)] px-5 py-3 lg:border-b-0 lg:px-0 lg:pb-2 lg:pt-0">
          <h2 id="catalog-filters-title" className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--foreground)]">Filtros</h2>
          <div className="flex items-center gap-1">
            {activeFilterChips.length > 0 && (
              <button type="button" onClick={resetFilters} className="min-h-11 rounded-full px-3 text-sm font-semibold text-[color:var(--accent-strong)] hover:bg-[color:var(--brand-tint)]">
                Limpiar filtros
              </button>
            )}
            <button
              ref={filtersCloseRef}
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl leading-none text-[color:var(--foreground)] hover:bg-black/5 lg:hidden"
              aria-label="Cerrar filtros"
            >
              ×
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 lg:overflow-visible lg:px-0">
          {/* Precio: el cliente ve «Precio»; internamente se compara el precio vigente sin IGV. */}
          {prices.length > 1 && maxGlobal > minGlobal && (
            <fieldset className="border-b border-[color:var(--border)] pb-5 pt-2">
              <legend className="flex min-h-12 items-center text-[15px] font-semibold text-[color:var(--foreground)]">Precio</legend>
              <div className="relative h-10">
                <div className="absolute inset-x-2.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200" />
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[color:var(--accent)]"
                  style={{ left: `calc(0.625rem + (100% - 1.25rem) * ${priceMinPercent / 100})`, right: `calc(0.625rem + (100% - 1.25rem) * ${(100 - priceMaxPercent) / 100})` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={priceMinPercent}
                  onChange={(e) => setMinFromPercent(Number(e.target.value))}
                  className="price-range absolute inset-x-0 top-1/2 z-[2] w-full -translate-y-1/2 appearance-none bg-transparent"
                  aria-label="Precio mínimo"
                  aria-valuetext={lowV === null ? "Sin mínimo" : `S/ ${money(lowV)}`}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.5}
                  value={priceMaxPercent}
                  onChange={(e) => setMaxFromPercent(Number(e.target.value))}
                  className="price-range absolute inset-x-0 top-1/2 z-[3] w-full -translate-y-1/2 appearance-none bg-transparent"
                  aria-label="Precio máximo"
                  aria-valuetext={highV === null ? "Sin máximo" : `S/ ${money(highV)}`}
                />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-[color:var(--foreground-soft)]">Desde (S/)</span>
                  <input inputMode="decimal" value={minPrice} placeholder={money(minGlobal)} onChange={(e) => setMinPrice(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-white px-3 text-[15px] text-[color:var(--foreground)]" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[color:var(--foreground-soft)]">Hasta (S/)</span>
                  <input inputMode="decimal" value={maxPrice} placeholder={money(maxGlobal)} onChange={(e) => setMaxPrice(e.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-[color:var(--border-strong)] bg-white px-3 text-[15px] text-[color:var(--foreground)]" />
                </label>
              </div>
            </fieldset>
          )}

          {facets.map((facet, index) => (
            <FilterGroup
              key={facet.key}
              facet={facet}
              options={facetOptions[facet.key]}
              selected={selection[facet.key]}
              onToggle={(value) => toggleFacet(facet.key, value)}
              defaultOpen={index < OPEN_FACETS}
            />
          ))}

          {batteryApplies && (
            <details open={Boolean(batteryMinimum)} className="group border-b border-[color:var(--border)] py-1 last:border-b-0">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-[15px] font-semibold text-[color:var(--foreground)] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] [&::-webkit-details-marker]:hidden">
                <span id="filter-battery">Batería mínima</span>
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-[color:var(--foreground-soft)] transition-transform group-open:rotate-180"><path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </summary>
              <div role="group" aria-labelledby="filter-battery" className="flex flex-wrap gap-2 pb-4 pt-1">
                {["", ...BATTERY_STEPS].map((step) => {
                  const active = batteryMinimum === step;
                  return (
                    <button key={step || "any"} type="button" aria-pressed={active} onClick={() => setBatteryMinimum(step)} className={`min-h-11 rounded-xl border px-3.5 text-sm ${active ? "border-[color:var(--accent)] bg-[color:var(--brand-tint)] font-semibold text-[color:var(--accent-strong)]" : "border-[color:var(--border-strong)] bg-white text-[color:var(--foreground)] hover:border-[color:var(--accent)]"}`}>
                      {step ? `${step}% o más` : "Cualquiera"}
                    </button>
                  );
                })}
              </div>
            </details>
          )}
        </div>

        <div className="border-t border-[color:var(--border)] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
          <button type="button" onClick={() => { setFiltersOpen(false); document.getElementById("cat-grid")?.scrollIntoView({ behavior: "smooth" }); }} className="btn-primary min-h-12 w-full rounded-full bg-[color:var(--foreground)] px-5 text-[15px] font-semibold text-white">
            {filteredMeta.length ? `Ver ${resultsLabel}` : "Sin resultados con estos filtros"}
          </button>
        </div>
      </aside>

      <section className="order-1 lg:order-2">
        <div className="catalog-flat surface-card soft-outline p-3 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)] sm:block">
                Catálogo
              </div>
              <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[color:var(--foreground)] sm:mt-2 sm:text-2xl sm:tracking-[-0.04em]">
                <span aria-live="polite">{filteredMeta.length} {filteredMeta.length === 1 ? "equipo encontrado" : "equipos encontrados"}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full">
                <label htmlFor="catalog-search" className="sr-only">Buscar en el catálogo</label>
                <input ref={searchRef} id="catalog-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej.: MacBook Air M4, Air 16/512, iPhone 15 128GB" className="min-h-11 w-full rounded-full border border-black/10 bg-white px-5 pr-12 text-sm" />
                {search && <button type="button" onClick={() => setSearch("")} aria-label="Limpiar búsqueda" className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-black/5">×</button>}
              </div>
              {availabilityCounts.preorder > 0 && <div className="flex w-full items-center rounded-full border border-black/10 bg-white/75 p-1 sm:w-auto">
                {[
                  { key: "all" as const, label: "Todos", count: availabilityCounts.all },
                  { key: "warehouse" as const, label: "En almacén", count: availabilityCounts.warehouse },
                  { key: "preorder" as const, label: "Preventa", count: availabilityCounts.preorder },
                ].map((option) => {
                  const active = availability === option.key;
                  return (
                    <button
                      key={option.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setAvailability(option.key)}
                      className={`flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-medium sm:flex-none sm:px-3 ${
                        active
                          ? "bg-[color:var(--foreground)] text-white shadow-sm"
                          : "text-[color:var(--foreground-soft)] hover:bg-black/[0.04] hover:text-[color:var(--foreground)]"
                      }`}
                    >
                      <span>{option.label}</span>
                      <span className={`text-[10px] ${active ? "text-white/70" : "text-[color:var(--foreground-soft)]"}`}>
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>}

              <label className="hidden min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm text-[color:var(--foreground)] lg:inline-flex">
                <span className="text-[color:var(--foreground-soft)]">Ordenar</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="border-0 bg-transparent p-0 text-sm font-semibold shadow-none focus:shadow-none">
                  {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </div>

          {/* Móvil y tablet: filtros y orden siempre a mano al recorrer el catálogo. */}
          <div className="sticky top-[72px] z-20 -mx-3 mt-3 space-y-2 bg-[color:var(--background)] px-3 py-2 sm:-mx-5 sm:bg-white sm:px-5 lg:hidden">
            <div className="flex items-center gap-2">
              <button
                ref={filtersButtonRef}
                type="button"
                aria-expanded={filtersOpen}
                aria-controls="catalog-filters"
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-[color:var(--foreground)] sm:flex-none"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
                Filtros
                {activeFilters.length > 0 && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[11px] font-bold text-white" aria-label={`${activeFilters.length} aplicados`}>{activeFilters.length}</span>}
              </button>
              <label className="inline-flex min-h-11 flex-1 items-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm text-[color:var(--foreground)] sm:flex-none">
                <span className="text-[color:var(--foreground-soft)]">Ordenar</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold shadow-none focus:shadow-none">
                  {sortOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            {quickFacet && quickOptions.length > 1 && (
              <div role="group" aria-label={`Filtro rápido: ${quickFacet.title}`} className="ms-shelf -mx-3 flex gap-2 overflow-x-auto px-3 sm:-mx-5 sm:px-5">
                {quickOptions.map(({ value }) => {
                  const active = selection[quickFacet.key].includes(value);
                  return (
                    <button key={value} type="button" aria-pressed={active} onClick={() => toggleFacet(quickFacet.key, value)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${active ? "bg-[color:var(--foreground)] text-white" : "border border-black/10 bg-white text-[color:var(--foreground)]"}`}>
                      {quickFacet.label ? quickFacet.label(value) : value}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {activeFilterChips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.remove}
                  aria-label={`Quitar filtro ${chip.label}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 text-sm font-medium text-blue-900 hover:border-blue-400"
                >
                  {chip.label}
                  <span aria-hidden="true" className="text-base leading-none">×</span>
                </button>
              ))}
              {activeFilterChips.length > 1 && (
                <button type="button" onClick={resetFilters} className="min-h-10 rounded-full px-3 text-sm font-semibold text-[color:var(--foreground-soft)] underline underline-offset-4 hover:text-[color:var(--foreground)]">
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          <div id="cat-grid" className={`mt-6 ${CATALOG_GRID_CLASS}`}>
            {filteredMeta.length ? (
              filteredMeta.map((item, index) => {
                const row = item.row;
                const slug = String(row.slug);
                const stock = Number(row?.product?.stock ?? row?.staged?.stock ?? 0);
                const selected = compareSlugs.includes(slug);
                return (
                  <CatalogProductCard
                    key={row.id}
                    priority={index < 3}
                    data={{
                      slug,
                      title: row.product?.title || row.staged?.title || slug,
                      image: (row.images && row.images[0]) || row.staged?.images?.[0] || "/placeholder.svg",
                      color: String(row.product?.color || row.staged?.color || item.notes?.color || "").trim(),
                      specLines: compactSpecs(item),
                      aestheticLabel: detailCountLabel(item.detailImages.length, Boolean(item.conditionDescription)),
                      availabilityLabel: stock <= 0 ? "Agotado" : String(item.saleType).toUpperCase() === "PREVENTA" ? "En camino" : "Disponible",
                      condition: item.condition,
                      saleType: item.saleType,
                      promoLabel: item.promoLabel,
                      stockLabel: isNewCondition(item.condition) && Number.isFinite(stock) && stock >= 2 ? `Stock: ${stock} unidades` : "",
                      price: Number(item.price),
                      compareAt: item.compareAt,
                    }}
                    compare={{ selected, disabled: !selected && compareSlugs.length >= 3, onToggle: () => toggleCompare(slug) }}
                  />
                );
              })
            ) : (
              <div className="col-span-full rounded-[28px] border border-dashed border-black/12 bg-white/60 px-5 py-10 text-center text-sm text-[color:var(--foreground-soft)] sm:px-6">
                <div className="text-base font-semibold text-[color:var(--foreground)]">No encontramos equipos con esa búsqueda y estos filtros.</div>
                <p className="mx-auto mt-2 max-w-md leading-6">Prueba con menos palabras, quita algún filtro o escríbenos por WhatsApp y te ayudamos a encontrar una alternativa.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => { setSearch(""); resetFilters(); }} className="min-h-11 rounded-full border border-black/10 bg-white px-5 py-2 font-semibold text-[color:var(--foreground)]">Limpiar búsqueda y filtros</button>
                  <a href={whatsappUrl(`Hola, busco este equipo: ${search.trim() || "un equipo Apple"}`)} target="_blank" rel="noopener noreferrer" onClick={() => trackCatalogEvent("click_whatsapp", { source: "no_results" })} className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--foreground)] px-5 py-2 font-semibold text-white">Preguntar por WhatsApp</a>
                </div>
                {closeMatches.length > 0 && (
                  <div className="mt-8 text-left">
                    <div className="text-sm font-semibold text-[color:var(--foreground)]">Equipos parecidos que sí tenemos</div>
                    <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                      {closeMatches.map((m) => (
                        <li key={m.row.id}>
                          <Link href={`/product/${m.row.slug}`} className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 hover:border-blue-300">
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-[color:var(--foreground)]">{m.title}</span>
                              <span className="block truncate text-xs">{[compactSpecs(m)[0], m.condition].filter(Boolean).join(" · ")}</span>
                            </span>
                            <span className="shrink-0 text-right font-semibold text-emerald-700">S/ {withIgv(m.price).toLocaleString("es-PE", { maximumFractionDigits: 0 })}<span className="block text-[10px] font-medium text-[color:var(--foreground-soft)]">con IGV</span></span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
      {compareSlugs.length > 0 && <div className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 mx-auto max-w-4xl rounded-2xl border border-blue-200 bg-white p-3 shadow-[0_8px_32px_rgba(15,23,42,0.2)] sm:inset-x-4 sm:p-4" aria-label="Equipos elegidos para comparar">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0"><p className="text-sm font-bold text-slate-900">Comparar equipos · {compareSlugs.length} de 3</p><p className="text-xs text-slate-600">{compareSlugs.length === 1 ? "Elige al menos uno más." : "Ya puedes ver las diferencias."}</p></div>
          <div className="flex gap-2"><button type="button" onClick={clearCompare} className="min-h-11 rounded-full border border-slate-300 px-4 text-sm font-semibold text-slate-700">Limpiar</button><button type="button" disabled={compareSlugs.length < 2} onClick={() => setCompareOpen(true)} className="min-h-11 flex-1 rounded-full bg-blue-600 px-5 text-sm font-bold text-white disabled:bg-slate-200 disabled:text-slate-500 sm:flex-none">Comparar {compareSlugs.length >= 2 ? `estos ${compareSlugs.length}` : "equipos"}</button></div>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{compareSlugs.map((slug) => {
          const row = initialItems.find((item) => String(item.slug) === slug);
          const title = row?.product?.title || row?.staged?.title || slug;
          return <span key={slug} className="inline-flex max-w-56 shrink-0 items-center gap-1 rounded-full bg-slate-100 pl-3 pr-1 text-xs text-slate-800"><span className="truncate">{title}</span><button type="button" onClick={() => toggleCompare(slug)} aria-label={`Quitar ${title} de la comparación`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg hover:bg-slate-200">×</button></span>;
        })}</div>
      </div>}
      {compareOpen && compareSlugs.length >= 2 && <CompareDialog slugs={compareSlugs} onClose={closeCompare} onRemove={(slug) => { toggleCompare(slug); if (compareSlugs.length <= 2) setCompareOpen(false); }} />}
    </div>
  );
}
