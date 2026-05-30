"use client";
import Image from "next/image";
import React from "react";
import PriceWithIgv from "./PriceWithIgv";

type Row = any;

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
  if (row?.product?.status === "sold") return { price: 0, compareAt: null, condition: "Vendido", saleType: "SOLD" };
  try {
    const n = row?.staged?.notes && typeof row.staged.notes === "string" ? JSON.parse(row.staged.notes) : row?.staged?.notes || {};
    const saleType = String(row?.product?.sale_type || row?.staged?.sale_type || n?.saleType || "").toUpperCase();
    const salePrice = Number(row.product?.price ?? row.staged?.price ?? 0);
    const discount = Number(row?.product?.discount ?? row?.staged?.discount ?? n?.discount ?? n?.descuentoPorc ?? 0);
    const finalPrice = row?.product?.final_price ?? row?.staged?.final_price ?? n?.finalPrice ?? null;
    const condition = String(
      row?.product?.product_condition ||
        row?.staged?.product_condition ||
        n?.productCondition ||
        n?.estado ||
        ""
    );
    let price = salePrice;
    let compareAt: number | null = null;
    let promoLabel = "";
    if (saleType === "PROMOCION") {
      const mode = String(n?.discountMode || n?.discountType || "percent").toLowerCase();
      const computed = finalPrice !== null
        ? Number(finalPrice)
        : +(mode === "amount" ? Math.max(0, salePrice - discount) : salePrice * (1 - discount / 100)).toFixed(2);
      if (isFinite(computed) && computed > 0) price = computed;
      compareAt = salePrice || null;
      const savings = compareAt && compareAt > price ? compareAt - price : 0;
      promoLabel = mode === "amount" && discount > 0
        ? `Ahorra S/ ${discount.toFixed(2)}`
        : discount > 0
          ? `${discount}% OFF`
          : savings > 0
            ? `Ahorra S/ ${savings.toFixed(2)}`
            : "";
      return { price: price || 0, compareAt, condition, saleType, promoLabel };
    }
    if (!saleType && typeof n?.precioLista !== "undefined") {
      const p = Number(n?.precioLista || 0);
      const d = Number(n?.descuentoPorc || 0);
      const f = +(p * (1 - d / 100)).toFixed(2);
      compareAt = p || null;
      if (isFinite(f) && f > 0) price = f;
    }
    return { price: price || 0, compareAt, condition, saleType, promoLabel };
  } catch {
    return {
      price: Number(row.product?.price ?? row.staged?.price ?? 0) || 0,
      compareAt: null,
      condition: "",
      saleType: String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase(),
      promoLabel: "",
    };
  }
}

function dedupe<T>(arr: T[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function createdTime(row: Row) {
  const value = row?.created_at || row?.product?.created_at || row?.staged?.created_at || 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function promoRank(item: any) {
  const saleType = String(item.saleType || "").toUpperCase();
  const compareAt = Number(item.compareAt || 0);
  const price = Number(item.price || 0);
  const hasSavings = compareAt > price && price > 0;
  return saleType === "PROMOCION" || hasSavings ? 1 : 0;
}

function toneForCondition(condition: string) {
  const value = condition.toLowerCase();
  if (value.includes("nuevo")) return "bg-[rgba(230,245,236,0.92)] text-[#1f6c43]";
  if (value.includes("open")) return "bg-[rgba(255,242,214,0.96)] text-[#8a5b11]";
  if (value.includes("usad")) return "bg-[rgba(231,239,255,0.96)] text-[#305fbe]";
  return "bg-white/88 text-[color:var(--foreground-soft)]";
}

function isNewCondition(condition: unknown) {
  return String(condition || "").toLowerCase().includes("nuevo");
}

function FilterSection({
  title,
  options,
  selected,
  onToggle,
  renderLabel,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  renderLabel?: (value: string) => string;
}) {
  if (!options.length) return null;
  return (
    <div className="rounded-[22px] border border-black/6 bg-white/70 p-3 backdrop-blur-xl lg:rounded-[26px] lg:p-4">
      <div className="text-sm font-semibold text-[color:var(--foreground)]">{title}</div>
      <div className="mt-2 max-h-44 space-y-1.5 overflow-auto lg:mt-3 lg:max-h-64 lg:space-y-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center justify-between rounded-[16px] border px-3 py-2.5 text-sm lg:rounded-[18px] lg:py-3 ${
                active
                  ? "border-[rgba(26,115,232,0.35)] bg-[rgba(26,115,232,0.08)] text-[color:var(--foreground)]"
                  : "border-black/6 bg-white/75 text-[color:var(--foreground-soft)]"
              }`}
            >
              <span>{renderLabel ? renderLabel(option) : option}</span>
              <input type="checkbox" checked={active} onChange={() => onToggle(option)} className="h-4 w-4 accent-[color:var(--accent)]" />
            </label>
          );
        })}
      </div>
    </div>
  );
}

export default function CategoryBrowser({ initialItems, category }: { initialItems: Row[]; category?: string }) {
  const normalizedCategory = String(category || initialItems?.[0]?.category || "").toLowerCase();
  const isMacbook = normalizedCategory === "macbook";
  const isIpad = normalizedCategory === "ipad";
  const isIphone = normalizedCategory === "iphone";
  const isWatch = normalizedCategory === "watch";
  const [tipo, setTipo] = React.useState<string[]>([]);
  const [proc, setProc] = React.useState<string[]>([]);
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [rams, setRams] = React.useState<string[]>([]);
  const [ssds, setSsds] = React.useState<string[]>([]);
  const [connectivity, setConnectivity] = React.useState<string[]>([]);
  const [series, setSeries] = React.useState<string[]>([]);
  const [sort, setSort] = React.useState<"price_asc" | "price_desc" | "none">("none");
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  const meta = React.useMemo(
    () =>
      initialItems
        .filter((row) => row?.product?.status !== "sold")
        .map((row) => ({ row, ...priceMeta(row), ...parseNotes(row) })),
    [initialItems]
  );

  const prices = React.useMemo(() => meta.map((m) => m.price).filter((n) => isFinite(n) && n >= 0), [meta]);
  const minGlobal = React.useMemo(() => (prices.length ? Math.floor(Math.min(...prices)) : 0), [prices]);
  const maxGlobal = React.useMemo(() => (prices.length ? Math.ceil(Math.max(...prices)) : 0), [prices]);

  const [minPrice, setMinPrice] = React.useState<string>("");
  const [maxPrice, setMaxPrice] = React.useState<string>("");
  React.useEffect(() => {
    if (minPrice === "" && isFinite(minGlobal)) setMinPrice(String(minGlobal));
    if (maxPrice === "" && isFinite(maxGlobal)) setMaxPrice(String(maxGlobal));
  }, [minGlobal, maxGlobal, minPrice, maxPrice]);

  const options = React.useMemo(() => {
    const titleOf = (m: any) => String(m.row?.product?.title || m.row?.staged?.title || m.title || "");
    return {
      tipos: sortGama(dedupe(
        meta
          .map((m) => {
            const title = titleOf(m);
            if (isIphone) return normalizeIphoneModel(m.tipo, title);
            if (isIpad) return (m.tipo || title.match(/\biPad\s+(Mini|Air|Pro)\b/i)?.[1] || "").toString();
            if (isMacbook) return (m.tipo || title.match(/\b(Air|Pro|Neo)\b/i)?.[1] || "").toString();
            return String(m.tipo || "").trim();
          })
          .map((s) => s.replace(/\bmac\s*book\s*/i, ""))
          .filter(Boolean)
      ), normalizedCategory),
      procs: dedupe(meta.map((m) => String(m.proc || titleOf(m).match(/\bM[0-9a-z]+\b/i)?.[0] || ""))),
      sizes: dedupe(meta.map((m) => String(m.size || titleOf(m).match(/\b(1[0-9](?:\.[0-9])?|4[0-9])\b/)?.[1] || "").replace(/\s*mm$/i, ""))).sort((a, b) => numericRank(a) - numericRank(b)),
      rams: dedupe(meta.map((m) => String(m.ram))).map((s) => s.replace(/\s*GB/i, "GB")).filter(Boolean),
      ssds: dedupe(meta.map((m) => normalizeStorage(m.storage || titleOf(m).match(/\b(\d+\s*(?:GB|TB))\b/i)?.[1] || ""))).filter(Boolean).sort((a, b) => storageRank(a) - storageRank(b)),
      connectivity: dedupe(meta.map((m) => normalizeConnectivity(m.connectivity || titleOf(m)))),
      series: sortSeries(dedupe(meta.map((m) => normalizeWatchSeries(m)))),
    };
  }, [isIpad, isIphone, isMacbook, meta, normalizedCategory]);

  const rawMinV = Number(minPrice || minGlobal || 0);
  const rawMaxV = Number(maxPrice || maxGlobal || 0);
  const minV = Math.min(rawMinV, rawMaxV);
  const maxV = Math.max(rawMinV, rawMaxV);

  const filteredMeta = React.useMemo(() => {
    let arr = meta.filter((m) => m.price >= minV && m.price <= maxV);
    if (tipo.length) {
      arr = arr.filter((m) => {
        const title = String(m.row?.product?.title || m.row?.staged?.title || m.title || "");
        const value = isIphone ? normalizeIphoneModel(m.tipo, title) : String(m.tipo || title);
        return tipo.some((t) => new RegExp(escapeRegExp(t), "i").test(value));
      });
    }
    if (proc.length) arr = arr.filter((m) => proc.some((p) => new RegExp(escapeRegExp(p), "i").test(m.proc || m.row?.product?.title || "")));
    if (sizes.length) arr = arr.filter((m) => sizes.includes(String(m.size)));
    if (rams.length) arr = arr.filter((m) => rams.includes(String(m.ram)));
    if (ssds.length) arr = arr.filter((m) => ssds.includes(normalizeStorage(m.storage)));
    if (connectivity.length) arr = arr.filter((m) => connectivity.includes(normalizeConnectivity(m.connectivity || m.title)));
    if (series.length) arr = arr.filter((m) => series.includes(normalizeWatchSeries(m)));
    if (sort === "price_asc") arr = [...arr].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") arr = [...arr].sort((a, b) => b.price - a.price);
    if (sort === "none") {
      arr = [...arr].sort((a, b) =>
        promoRank(b) - promoRank(a) ||
        createdTime(b.row) - createdTime(a.row)
      );
    }
    return arr;
  }, [connectivity, isIphone, meta, minV, maxV, tipo, proc, sizes, rams, ssds, series, sort]);

  const activeFilters = [...tipo, ...proc, ...sizes.map((s) => `${s}${isWatch ? "mm" : "\""}`), ...rams, ...ssds, ...connectivity, ...series];
  const toggle = (list: string[], setList: (value: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const bins = React.useMemo(() => {
    const amount = 16;
    const min = minGlobal;
    const max = Math.max(maxGlobal, min + 1);
    const step = (max - min) / amount;
    const arr = new Array(amount).fill(0);
    prices.forEach((p) => {
      const idx = Math.min(amount - 1, Math.max(0, Math.floor((p - min) / step)));
      arr[idx] += 1;
    });
    const maxCount = Math.max(1, ...arr);
    return arr.map((c) => Math.round(62 * (c / maxCount)));
  }, [prices, minGlobal, maxGlobal]);

  const toPercent = (v: number) => {
    const min = minGlobal;
    const max = Math.max(maxGlobal, min + 1);
    return ((v - min) / (max - min)) * 100;
  };

  const fromPercent = (pct: number) => {
    const min = minGlobal;
    const max = Math.max(maxGlobal, min + 1);
    return Math.round(min + (pct / 100) * (max - min));
  };

  const setMinFromPercent = (pct: number) => {
    setMinPrice(String(Math.min(fromPercent(pct), maxV)));
  };

  const setMaxFromPercent = (pct: number) => {
    setMaxPrice(String(Math.max(fromPercent(pct), minV)));
  };

  const resetFilters = () => {
    setTipo([]);
    setProc([]);
    setSizes([]);
    setRams([]);
    setSsds([]);
    setConnectivity([]);
    setSeries([]);
    setSort("none");
    setMinPrice(String(minGlobal));
    setMaxPrice(String(maxGlobal));
  };

  const priceMinPercent = Math.max(0, Math.min(100, toPercent(minV)));
  const priceMaxPercent = Math.max(0, Math.min(100, toPercent(maxV)));

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className={`${filtersOpen ? "fixed inset-x-4 top-20 z-[60] block max-h-[72svh] overflow-y-auto sm:left-auto sm:right-4 sm:w-[360px]" : "hidden"} lg:static lg:order-1 lg:block lg:max-h-none lg:w-auto lg:overflow-visible`}>
        <div className="space-y-4">
          <div className="surface-card soft-outline p-4 lg:p-5">
            <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex items-start justify-between gap-3 rounded-t-[28px] bg-white/95 px-4 pb-3 pt-4 shadow-sm lg:static lg:mx-0 lg:mt-0 lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Filtros
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-lg leading-none text-[color:var(--foreground)] lg:hidden"
                aria-label="Cerrar filtros"
              >
                ×
              </button>
            </div>

            <div className="mt-4 rounded-[22px] border border-black/6 bg-white/70 p-3 lg:mt-5 lg:rounded-[24px] lg:p-4">
              <div className="text-sm font-semibold text-[color:var(--foreground)]">Precio</div>
              <div className="mt-3 flex h-14 items-end gap-1 lg:mt-4 lg:h-20">
                {bins.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-full bg-[linear-gradient(180deg,rgba(26,115,232,0.72),rgba(26,115,232,0.18))]" style={{ height: `${Math.max(6, Math.round(h * 0.72))}px` }} />
                ))}
              </div>

              <div className="mt-4 relative h-9">
                <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
                <div
                  className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[color:var(--accent)]"
                  style={{ left: `calc(${priceMinPercent}% + 0.5rem)`, right: `calc(${100 - priceMaxPercent}% + 0.5rem)` }}
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={priceMinPercent}
                  onChange={(e) => setMinFromPercent(Number(e.target.value))}
                  className="price-range absolute inset-x-2 top-1/2 z-[2] w-[calc(100%-1rem)] -translate-y-1/2 appearance-none bg-transparent"
                  aria-label="Precio minimo"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={priceMaxPercent}
                  onChange={(e) => setMaxFromPercent(Number(e.target.value))}
                  className="price-range absolute inset-x-2 top-1/2 z-[3] w-[calc(100%-1rem)] -translate-y-1/2 appearance-none bg-transparent"
                  aria-label="Precio maximo"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 lg:mt-4 lg:gap-3">
                <div className="rounded-[16px] border border-black/6 bg-white/85 p-2.5 lg:rounded-[18px] lg:p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                    Min
                  </div>
                  <input inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="mt-2 w-full border-0 bg-transparent p-0 text-sm text-[color:var(--foreground)] shadow-none focus:shadow-none" />
                </div>
                <div className="rounded-[16px] border border-black/6 bg-white/85 p-2.5 lg:rounded-[18px] lg:p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                    Max
                  </div>
                  <input inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="mt-2 w-full border-0 bg-transparent p-0 text-sm text-[color:var(--foreground)] shadow-none focus:shadow-none" />
                </div>
              </div>

              <button
                onClick={() => {
                  setFiltersOpen(false);
                  window?.document?.getElementById("cat-grid")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="btn-primary mt-3 w-full rounded-full bg-[color:var(--foreground)] py-2.5 text-sm font-semibold text-white hover:bg-black lg:mt-4 lg:py-3"
              >
                Ver {filteredMeta.length} productos
              </button>
            </div>

            <div className="mt-3 space-y-3 lg:mt-4 lg:space-y-4">
              {(isMacbook || isIpad || isIphone) && (
                <FilterSection title="Gama" options={options.tipos} selected={tipo} onToggle={(value) => toggle(tipo, setTipo, value)} />
              )}
              {(isMacbook || isIpad) && (
                <FilterSection title="Procesador" options={options.procs} selected={proc} onToggle={(value) => toggle(proc, setProc, value)} />
              )}
              {(isMacbook || isIpad || isWatch) && (
                <FilterSection
                  title={isWatch ? "Tamaño" : "Pantalla"}
                  options={options.sizes}
                  selected={sizes}
                  onToggle={(value) => toggle(sizes, setSizes, value)}
                  renderLabel={(value) => (isWatch ? `${value} mm` : `${value}"`)}
                />
              )}
              {isMacbook && <FilterSection title="RAM" options={options.rams} selected={rams} onToggle={(value) => toggle(rams, setRams, value)} />}
              {(isMacbook || isIpad || isIphone) && (
                <FilterSection title="Almacenamiento" options={options.ssds} selected={ssds} onToggle={(value) => toggle(ssds, setSsds, value)} />
              )}
              {(isIpad || isWatch) && (
                <FilterSection title="Conectividad" options={options.connectivity} selected={connectivity} onToggle={(value) => toggle(connectivity, setConnectivity, value)} />
              )}
              {isWatch && <FilterSection title="Serie" options={options.series} selected={series} onToggle={(value) => toggle(series, setSeries, value)} />}
            </div>

            <button onClick={resetFilters} className="btn-secondary mt-4 w-full rounded-full border border-black/10 bg-white/70 py-3 text-sm font-medium text-[color:var(--foreground)]">
              Limpiar filtros
            </button>
          </div>
        </div>
      </aside>

      <section className="order-1 lg:order-2">
        <div className="surface-card soft-outline p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                Catalogo
              </div>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                {filteredMeta.length} productos listos para comparar.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-secondary inline-flex rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm text-[color:var(--foreground)] lg:hidden"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/75 px-3 py-2 text-sm text-[color:var(--foreground)]">
                <span className="text-[color:var(--foreground-soft)]">Ordenar</span>
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:shadow-none">
                  <option value="none">Mejores</option>
                  <option value="price_desc">Mayor precio</option>
                  <option value="price_asc">Menor precio</option>
                </select>
              </div>
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <span key={filter} className="pill-chip !px-3 !py-2 !text-xs !font-medium !tracking-[0.06em]">
                  {filter}
                </span>
              ))}
            </div>
          )}

          <div id="cat-grid" className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredMeta.length ? (
              filteredMeta.map((item) => {
                const row = item.row;
                const img = (row.images && row.images[0]) || row.staged?.images?.[0] || "/placeholder.svg";
                const title: string = row.product?.title || row.staged?.title || row.slug;
                const stock = Number(row?.product?.stock ?? row?.staged?.stock ?? 0);
                const stockLabel = isNewCondition(item.condition) && Number.isFinite(stock) && stock >= 2 ? `Stock: ${stock} unidades` : "";
                return (
                  <a
                    key={row.id}
                    href={`/product/${row.slug}`}
                    className="group rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.94))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                  >
                    <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#f5f7fa,#ebf0f6)]">
                      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${toneForCondition(item.condition || "Disponible")}`}>
                          {item.condition || "Disponible"}
                        </span>
                        {item.saleType && item.saleType !== "VENTA_SIMPLE" && (item.saleType !== "PROMOCION" || item.promoLabel) && (
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold text-white ${item.saleType === "PROMOCION" ? "bg-rose-600 shadow-[0_8px_18px_rgba(225,29,72,0.28)]" : "bg-black/85"}`}>
                            {item.saleType === "PROMOCION" ? item.promoLabel : item.saleType.toLowerCase()}
                          </span>
                        )}
                        {stockLabel && (
                          <span className="rounded-full bg-[rgba(230,245,236,0.92)] px-3 py-1 text-[11px] font-semibold text-[#1f6c43]">
                            {stockLabel}
                          </span>
                        )}
                      </div>
                      <div className="relative aspect-[4/3] p-5">
                        <Image
                          src={img}
                          alt={title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-lg font-semibold leading-6 tracking-[-0.03em] text-[color:var(--foreground)] line-clamp-2">
                        {title}
                      </div>
                      <PriceWithIgv price={Number(item.price)} compareAt={item.compareAt} wrapperClassName="mt-3" />
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="col-span-full rounded-[28px] border border-dashed border-black/12 bg-white/60 px-6 py-14 text-center text-sm text-[color:var(--foreground-soft)]">
                No hay productos publicados con esta combinacion de filtros.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
