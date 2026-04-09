"use client";
import React from "react";

type Row = any;

function parseNotes(row: Row) {
  try {
    const n = row?.staged?.notes && typeof row.staged.notes === "string" ? JSON.parse(row.staged.notes) : row?.staged?.notes || {};
    const specs = (n?.specs || n) as any;
    const d = (specs?.detalle || {}) as any;
    const size = d["tamaño"] || d.tamanio || d.tamano || "";
    const proc = d.procesador || "";
    const ram = d.ram || "";
    const ssd = d.almacenamiento || d.ssd || "";
    const gama = d.gama || "";
    return { notes: n, specs, d, size: String(size), proc: String(proc), ram: String(ram), ssd: String(ssd), tipo: String(gama) };
  } catch {
    return { notes: {}, specs: {}, d: {}, size: "", proc: "", ram: "", ssd: "", tipo: "" };
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
    if (saleType === "PROMOCION") {
      const computed = finalPrice !== null ? Number(finalPrice) : +(salePrice * (1 - discount / 100)).toFixed(2);
      if (isFinite(computed) && computed > 0) price = computed;
      compareAt = salePrice || null;
      return { price: price || 0, compareAt, condition, saleType };
    }
    if (!saleType && typeof n?.precioLista !== "undefined") {
      const p = Number(n?.precioLista || 0);
      const d = Number(n?.descuentoPorc || 0);
      const f = +(p * (1 - d / 100)).toFixed(2);
      compareAt = p || null;
      if (isFinite(f) && f > 0) price = f;
    }
    return { price: price || 0, compareAt, condition, saleType };
  } catch {
    return {
      price: Number(row.product?.price ?? row.staged?.price ?? 0) || 0,
      compareAt: null,
      condition: "",
      saleType: String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase(),
    };
  }
}

function dedupe<T>(arr: T[]) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function toneForCondition(condition: string) {
  const value = condition.toLowerCase();
  if (value.includes("nuevo")) return "bg-[rgba(230,245,236,0.92)] text-[#1f6c43]";
  if (value.includes("open")) return "bg-[rgba(255,242,214,0.96)] text-[#8a5b11]";
  if (value.includes("usad")) return "bg-[rgba(231,239,255,0.96)] text-[#305fbe]";
  return "bg-white/88 text-[color:var(--foreground-soft)]";
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
    <div className="rounded-[26px] border border-black/6 bg-white/70 p-4 backdrop-blur-xl">
      <div className="text-sm font-semibold text-[color:var(--foreground)]">{title}</div>
      <div className="mt-3 max-h-64 space-y-2 overflow-auto">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <label
              key={option}
              className={`flex cursor-pointer items-center justify-between rounded-[18px] border px-3 py-3 text-sm ${
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

export default function CategoryBrowser({ initialItems }: { initialItems: Row[] }) {
  const [tipo, setTipo] = React.useState<string[]>([]);
  const [proc, setProc] = React.useState<string[]>([]);
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [rams, setRams] = React.useState<string[]>([]);
  const [ssds, setSsds] = React.useState<string[]>([]);
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
    return {
      tipos: dedupe(
        meta
          .map((m) =>
            (m.tipo || String(m.row?.product?.title || m.row?.staged?.title || "").match(/\b(Air|Pro)\b/i)?.[0] || "")
              .toString()
              .replace(/\s+/g, " ")
              .trim()
          )
          .map((s) => s.replace(/\bmac\s*book\s*/i, ""))
          .filter(Boolean)
      ),
      procs: dedupe(meta.map((m) => String(m.proc || String(m.row?.product?.title || "").match(/\bM[0-9a-z]+\b/i)?.[0] || ""))),
      sizes: dedupe(meta.map((m) => String(m.size || String(m.row?.product?.title || "").match(/\b(1[0-9](?:\.[0-9])?)\b/)?.[1] || ""))),
      rams: dedupe(meta.map((m) => String(m.ram))).map((s) => s.replace(/\s*GB/i, "GB")).filter(Boolean),
      ssds: dedupe(meta.map((m) => String(m.ssd))).map((s) => s.replace(/\s*GB|\s*TB/i, (match) => match)).filter(Boolean),
    };
  }, [meta]);

  const minV = Number(minPrice || minGlobal || 0);
  const maxV = Number(maxPrice || maxGlobal || 0);

  const filteredMeta = React.useMemo(() => {
    let arr = meta.filter((m) => m.price >= minV && m.price <= maxV);
    if (tipo.length) arr = arr.filter((m) => tipo.some((t) => new RegExp(t, "i").test(String(m.tipo || m.row?.product?.title || ""))));
    if (proc.length) arr = arr.filter((m) => proc.some((p) => new RegExp(p, "i").test(m.proc || m.row?.product?.title || "")));
    if (sizes.length) arr = arr.filter((m) => sizes.includes(String(m.size)));
    if (rams.length) arr = arr.filter((m) => rams.includes(String(m.ram)));
    if (ssds.length) arr = arr.filter((m) => ssds.includes(String(m.ssd)));
    if (sort === "price_asc") arr = [...arr].sort((a, b) => a.price - b.price);
    if (sort === "price_desc") arr = [...arr].sort((a, b) => b.price - a.price);
    return arr;
  }, [meta, minV, maxV, tipo, proc, sizes, rams, ssds, sort]);

  const activeFilters = [...tipo, ...proc, ...sizes.map((s) => `${s}"`), ...rams, ...ssds];
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

  const resetFilters = () => {
    setTipo([]);
    setProc([]);
    setSizes([]);
    setRams([]);
    setSsds([]);
    setSort("none");
    setMinPrice(String(minGlobal));
    setMaxPrice(String(maxGlobal));
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="order-2 lg:order-1">
        <div className={`${filtersOpen ? "block" : "hidden"} space-y-4 lg:block`}>
          <div className="surface-card soft-outline p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
              Filtrar
            </div>
            <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
              Refina por precio y especificacion.
            </div>

            <div className="mt-5 rounded-[24px] border border-black/6 bg-white/70 p-4">
              <div className="text-sm font-semibold text-[color:var(--foreground)]">Precio</div>
              <div className="mt-4 flex h-20 items-end gap-1">
                {bins.map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-full bg-[linear-gradient(180deg,rgba(26,115,232,0.72),rgba(26,115,232,0.18))]" style={{ height: `${Math.max(8, h)}px` }} />
                ))}
              </div>

              <div className="mt-4 relative h-8">
                <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={toPercent(minV)}
                  onChange={(e) => setMinPrice(String(fromPercent(Number(e.target.value))))}
                  className="absolute inset-x-2 w-[calc(100%-1rem)] appearance-none bg-transparent"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={toPercent(maxV)}
                  onChange={(e) => setMaxPrice(String(fromPercent(Number(e.target.value))))}
                  className="absolute inset-x-2 w-[calc(100%-1rem)] appearance-none bg-transparent"
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-[18px] border border-black/6 bg-white/85 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                    Min
                  </div>
                  <input inputMode="numeric" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="mt-2 w-full border-0 bg-transparent p-0 text-sm text-[color:var(--foreground)] shadow-none focus:shadow-none" />
                </div>
                <div className="rounded-[18px] border border-black/6 bg-white/85 p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                    Max
                  </div>
                  <input inputMode="numeric" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="mt-2 w-full border-0 bg-transparent p-0 text-sm text-[color:var(--foreground)] shadow-none focus:shadow-none" />
                </div>
              </div>

              <button
                onClick={() => window?.document?.getElementById("cat-grid")?.scrollIntoView({ behavior: "smooth" })}
                className="btn-primary mt-4 w-full rounded-full bg-[color:var(--foreground)] py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Ver {filteredMeta.length} productos
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <FilterSection title="Tipo" options={options.tipos} selected={tipo} onToggle={(value) => toggle(tipo, setTipo, value)} />
              <FilterSection title="Procesador" options={options.procs} selected={proc} onToggle={(value) => toggle(proc, setProc, value)} />
              <FilterSection title="Pantalla" options={options.sizes} selected={sizes} onToggle={(value) => toggle(sizes, setSizes, value)} renderLabel={(value) => `${value}"`} />
              <FilterSection title="RAM" options={options.rams} selected={rams} onToggle={(value) => toggle(rams, setRams, value)} />
              <FilterSection title="SSD" options={options.ssds} selected={ssds} onToggle={(value) => toggle(ssds, setSsds, value)} />
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
                        {item.saleType && item.saleType !== "VENTA_SIMPLE" && (
                          <span className="rounded-full bg-black/85 px-3 py-1 text-[11px] font-semibold text-white">
                            {item.saleType.toLowerCase()}
                          </span>
                        )}
                      </div>
                      <div className="aspect-[4/3] p-5">
                        <img src={img} alt={title} className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-lg font-semibold leading-6 tracking-[-0.03em] text-[color:var(--foreground)] line-clamp-2">
                        {title}
                      </div>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                          S/ {Number(item.price).toFixed(2)}
                        </span>
                        {item.compareAt && item.compareAt > item.price && (
                          <span className="text-sm text-[color:var(--foreground-soft)] line-through">
                            S/ {item.compareAt.toFixed(2)}
                          </span>
                        )}
                      </div>
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
