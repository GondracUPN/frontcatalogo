"use client";

import React from "react";
import { SalesTab, SellersTab } from "./SalesAnalyticsPanels";
import { funnelAction, overviewAction, productsAction, searchesAction, sourcesAction } from "./actions";
import { ColumnChart, Empty, fmt, LineChart, RankBars } from "./charts";
import { allowedGroups, bucketLabel, limaDateInput, presetPeriod, PRESETS, type Group, type Period } from "./period";

type Tab = "resumen" | "productos" | "busquedas" | "embudo" | "procedencia" | "ventas" | "vendedores";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "resumen", label: "Resumen" },
  { id: "productos", label: "Productos" },
  { id: "busquedas", label: "Búsquedas" },
  { id: "embudo", label: "Embudo" },
  { id: "procedencia", label: "Procedencia" },
];
const GROUP_LABELS: Record<Group, string> = { hour: "Hora", day: "Día", week: "Semana", month: "Mes", year: "Año" };
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const SOURCE_LABELS: Record<string, string> = { direct: "Directo", search: "Buscadores (Google…)", social: "Redes sociales", campaign: "Campañas / anuncios", referral: "Otros sitios" };
const DEVICE_LABELS: Record<string, string> = { mobile: "Celular", tablet: "Tableta", desktop: "Computadora", desconocido: "Desconocido" };
const money = (n: number) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctText = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toLocaleString("es-PE")}%`);

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-500">sin datos previos</span>;
  if (value === 0) return <span className="text-xs text-gray-500">= igual que antes</span>;
  const up = value > 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-green-700" : "text-red-700"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("es-PE")}% vs. periodo anterior
    </span>
  );
}

function Kpi({ label, metric, format = fmt, note }: { label: string; metric?: { current: number; previous: number; change: number | null }; format?: (n: number) => string; note?: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{metric ? format(metric.current) : "—"}</div>
      <div className="mt-1">{metric ? <Change value={metric.change} /> : null}</div>
      {metric && <div className="mt-0.5 text-xs text-gray-500">Antes: {format(metric.previous)}</div>}
      {note && <div className="mt-1 text-[11px] leading-4 text-gray-500">{note}</div>}
    </div>
  );
}

function Card({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {note && <p className="mt-0.5 text-xs text-gray-500">{note}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function useLoad<T>(loader: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, deps: unknown[]) {
  const [state, setState] = React.useState<{ loading: boolean; data: T | null; error: string }>({ loading: true, data: null, error: "" });
  React.useEffect(() => {
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: "" }));
    loader().then((result) => {
      if (cancelled) return;
      setState(result.ok ? { loading: false, data: result.data, error: "" } : { loading: false, data: null, error: result.error });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function Status({ loading, error }: { loading: boolean; error: string }) {
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>;
  if (loading) return <div role="status" className="text-sm text-gray-500">Calculando…</div>;
  return null;
}

export default function AnalyticsDashboard({ isAdmin = true }: { isAdmin?: boolean }) {
  const [owner, setOwner] = React.useState("macsomenos");
  const tabs = isAdmin ? [...TABS, { id: "ventas" as Tab, label: "Ventas" }, { id: "vendedores" as Tab, label: "Vendedores" }] : [{ id: "ventas" as Tab, label: "Mis ventas" }];
  const [presetKey, setPresetKey] = React.useState("30d");
  const [custom, setCustom] = React.useState(() => {
    const p = presetPeriod("30d");
    return { from: limaDateInput(p.from), to: limaDateInput(new Date(p.to.getTime() - 1)) };
  });
  const [tab, setTab] = React.useState<Tab>(isAdmin ? "resumen" : "ventas");
  const [nowStamp, setNowStamp] = React.useState(() => Date.now());
  const period: Period = React.useMemo(() => presetPeriod(presetKey, new Date(nowStamp), custom), [presetKey, custom, nowStamp]);
  const groups = allowedGroups(period);
  const [groupChoice, setGroupChoice] = React.useState<Group | null>(null);
  const group: Group = groupChoice && groups.includes(groupChoice) ? groupChoice : groups.includes(period.group) ? period.group : groups[0] || "day";
  const from = period.from.toISOString();
  const to = period.to.toISOString();

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => {
                setPresetKey(preset.key);
                setGroupChoice(null);
                setNowStamp(Date.now());
              }}
              className={`min-h-10 shrink-0 rounded-full px-3 text-sm ${presetKey === preset.key ? "bg-gray-900 font-semibold text-white" : "border border-gray-300 bg-white text-gray-700"}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {presetKey === "custom" && (
            <>
              <label className="grid gap-1 text-xs font-medium text-gray-600">Desde
                <input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="min-h-10 rounded-lg border border-gray-300 px-2 text-sm" />
              </label>
              <label className="grid gap-1 text-xs font-medium text-gray-600">Hasta
                <input type="date" value={custom.to} min={custom.from} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="min-h-10 rounded-lg border border-gray-300 px-2 text-sm" />
              </label>
            </>
          )}
          <label className="grid gap-1 text-xs font-medium text-gray-600">Agrupar por
            <select value={group} onChange={(e) => setGroupChoice(e.target.value as Group)} className="min-h-10 rounded-lg border border-gray-300 px-2 text-sm">
              {groups.map((g) => <option key={g} value={g}>{GROUP_LABELS[g]}</option>)}
            </select>
          </label>
          <p className="text-xs text-gray-500">Hora de Lima. Se compara con el periodo anterior de igual duración.</p>
        </div>
      </div>

      <div role="tablist" aria-label="Secciones de análisis" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {tabs.map((item) => (
          <button key={item.id} role="tab" aria-selected={tab === item.id} type="button" onClick={() => setTab(item.id)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === item.id ? "bg-[#2a78d6] text-white" : "border border-gray-300 bg-white text-gray-800"}`}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "ventas" && <SalesTab from={from} to={to} group={group} isAdmin={isAdmin} owner={owner} onOwner={setOwner} />}
      {isAdmin && tab === "vendedores" && <SellersTab from={from} to={to} onSelect={id=>{setOwner(id);setTab("ventas");}} />}
      {isAdmin && tab === "resumen" && <OverviewTab from={from} to={to} group={group} multiDay={period.to.getTime() - period.from.getTime() > 864e5 + 1} />}
      {isAdmin && tab === "productos" && <ProductsTab from={from} to={to} />}
      {isAdmin && tab === "busquedas" && <SearchesTab from={from} to={to} />}
      {isAdmin && tab === "embudo" && <FunnelTab from={from} to={to} />}
      {isAdmin && tab === "procedencia" && <SourcesTab from={from} to={to} />}
    </div>
  );
}

const SERIES_OPTIONS = [
  { key: "page_views", label: "Visitas (páginas vistas)", unit: "visitas" },
  { key: "sessions", label: "Sesiones", unit: "sesiones" },
  { key: "visitors", label: "Visitantes únicos estimados", unit: "visitantes" },
  { key: "product_views", label: "Vistas de productos", unit: "vistas" },
  { key: "interest", label: "Interés (WhatsApp + carrito)", unit: "acciones" },
] as const;

function OverviewTab({ from, to, group, multiDay }: { from: string; to: string; group: Group; multiDay: boolean }) {
  const state = useLoad<any>(() => overviewAction(from, to, group), [from, to, group]);
  const [seriesKey, setSeriesKey] = React.useState<(typeof SERIES_OPTIONS)[number]["key"]>("page_views");
  const data = state.data;
  const c = data?.comparison;
  const option = SERIES_OPTIONS.find((s) => s.key === seriesKey)!;
  return (
    <div className="space-y-4">
      <Status loading={state.loading} error={state.error} />
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Visitas (páginas vistas)" metric={c.page_views} note="Incluye a quienes no aceptaron cookies (sin identificarlos)." />
            <Kpi label="Sesiones" metric={c.sessions} note={`Solo visitantes que aceptaron analíticas${data.anonymousShare !== null ? ` (${data.anonymousShare}% de las visitas fueron anónimas)` : ""}.`} />
            <Kpi label="Visitantes únicos estimados" metric={c.visitors} note="Estimación con identificador aleatorio; no identifica personas." />
            <Kpi label="Vistas de productos" metric={c.product_views} />
            <Kpi label="Interés" metric={c.interest} note="Clics en WhatsApp + añadidos al carrito." />
            <Kpi label="Solicitudes de compra" metric={c.requests} />
            <Kpi label="Ventas entregadas (web)" metric={c.delivered} note="Solicitudes web marcadas como entregadas." />
            <Kpi label="Ventas registradas (todas)" metric={c.salesAmount} format={money} note={`${fmt(c.salesRecorded.current)} ventas en el panel (antes ${fmt(c.salesRecorded.previous)}).`} />
          </div>
          <p className="text-xs text-gray-500">Usuarios autenticados: no aplica; la tienda no tiene cuentas de clientes. Las visitas del panel interno no se cuentan.</p>

          <Card title="Evolución en el tiempo">
            <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
              {SERIES_OPTIONS.map((s) => (
                <button key={s.key} type="button" onClick={() => setSeriesKey(s.key)} className={`min-h-9 shrink-0 rounded-full px-3 text-xs ${seriesKey === s.key ? "bg-gray-900 font-semibold text-white" : "border border-gray-300 text-gray-700"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {data.series.some((p: any) => p[seriesKey] > 0) ? (
              <LineChart labels={data.series.map((p: any) => bucketLabel(p.bucket, group, multiDay))} values={data.series.map((p: any) => p[seriesKey])} unit={option.unit} />
            ) : <Empty />}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Horas con más tráfico" note={data.peakHour.n ? `Pico: ${data.peakHour.hour}:00–${data.peakHour.hour + 1}:00` : undefined}>
              {data.hours.some((h: any) => h.n) ? <ColumnChart labels={data.hours.map((h: any) => `${h.hour}h`)} values={data.hours.map((h: any) => h.n)} unit="visitas" /> : <Empty />}
            </Card>
            <Card title="Días de mayor actividad" note={data.peakWeekday.n ? `Más visitas: ${WEEKDAYS[data.peakWeekday.dow - 1]}` : undefined}>
              {data.weekdays.some((d: any) => d.n) ? <ColumnChart labels={WEEKDAYS} values={data.weekdays.map((d: any) => d.n)} unit="visitas" /> : <Empty />}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Tendencia por categoría" note="Vistas de productos frente al periodo anterior.">
              {data.categories.length ? (
                <ul className="divide-y text-sm">
                  {data.categories.map((cat: any) => (
                    <li key={cat.category} className="flex items-center justify-between gap-3 py-2">
                      <span className="capitalize text-gray-800">{cat.category}</span>
                      <span className="text-right tabular-nums">
                        <span className="font-semibold">{fmt(cat.current)}</span>
                        <span className="ml-2"><Change value={cat.change} /></span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <Empty />}
            </Card>
            <Card title="Dispositivos">
              <RankBars rows={data.devices.map((d: any) => ({ label: DEVICE_LABELS[d.device] || d.device, value: d.n }))} unit="visitas" />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function ProductsTab({ from, to }: { from: string; to: string }) {
  const state = useLoad<any>(() => productsAction(from, to), [from, to]);
  const [sort, setSort] = React.useState<"views" | "interest" | "requests" | "sold" | "salePerView">("views");
  const data = state.data;
  const items = React.useMemo(() => {
    if (!data) return [];
    const value = (item: any) => (sort === "salePerView" ? item.rates.salePerView ?? -1 : item[sort]);
    return [...data.items].sort((a, b) => value(b) - value(a));
  }, [data, sort]);
  return (
    <div className="space-y-4">
      <Status loading={state.loading} error={state.error} />
      {data && (
        <>
          <Card title="Rendimiento por producto" note="Vista → interés → solicitud → confirmación → venta. Las tasas se calculan sobre las vistas del mismo periodo.">
            <label className="mb-3 flex items-center gap-2 text-sm">Ordenar por
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="min-h-10 rounded-lg border border-gray-300 px-2">
                <option value="views">Vistas</option>
                <option value="interest">Interés</option>
                <option value="requests">Solicitudes</option>
                <option value="sold">Ventas</option>
                <option value="salePerView">Conversión a venta</option>
              </select>
            </label>
            {items.length ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-500">
                        <th className="py-2 pr-3 font-medium">Producto</th>
                        <th className="px-2 text-right font-medium">Vistas</th>
                        <th className="px-2 text-right font-medium">Únicas*</th>
                        <th className="px-2 text-right font-medium">WhatsApp</th>
                        <th className="px-2 text-right font-medium">Carrito</th>
                        <th className="px-2 text-right font-medium">Solicitudes</th>
                        <th className="px-2 text-right font-medium">Confirmadas</th>
                        <th className="px-2 text-right font-medium">Ventas</th>
                        <th className="px-2 text-right font-medium">Vista→venta</th>
                        <th className="px-2 text-right font-medium">Tiempo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.slice(0, 100).map((item: any) => (
                        <tr key={item.id} className="border-b last:border-0">
                          <td className="max-w-[280px] py-2 pr-3">
                            <div className="truncate font-medium text-gray-900">{item.title}</div>
                            <div className="text-xs text-gray-500">{item.sku} · {item.category || "—"}{!item.available ? " · sin stock" : ""}</div>
                          </td>
                          <td className="px-2 text-right tabular-nums">{fmt(item.views)}</td>
                          <td className="px-2 text-right tabular-nums">{fmt(item.unique_sessions)}</td>
                          <td className="px-2 text-right tabular-nums">{fmt(item.whatsapp)}</td>
                          <td className="px-2 text-right tabular-nums">{fmt(item.add_to_cart)}</td>
                          <td className="px-2 text-right tabular-nums">{fmt(item.requests)}</td>
                          <td className="px-2 text-right tabular-nums">{fmt(item.confirmed)}</td>
                          <td className="px-2 text-right tabular-nums">{fmt(item.sold)}</td>
                          <td className="px-2 text-right tabular-nums">{pctText(item.rates.salePerView)}</td>
                          <td className="px-2 text-right tabular-nums">{item.avgSeconds ? `${item.avgSeconds}s` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="space-y-2 md:hidden">
                  {items.slice(0, 60).map((item: any) => (
                    <li key={item.id} className="rounded-xl border border-gray-200 p-3">
                      <div className="font-medium text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500">{item.sku} · {item.category || "—"}{!item.available ? " · sin stock" : ""}</div>
                      <dl className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                        {[["Vistas", item.views], ["Interés", item.interest], ["Solicitudes", item.requests], ["Confirmadas", item.confirmed], ["Ventas", item.sold], ["Vista→venta", pctText(item.rates.salePerView)]].map(([label, value]) => (
                          <div key={String(label)} className="rounded-lg bg-gray-50 p-1.5"><dt className="text-gray-500">{label}</dt><dd className="font-semibold tabular-nums text-gray-900">{typeof value === "number" ? fmt(value) : value}</dd></div>
                        ))}
                      </dl>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-gray-500">* Únicas: sesiones distintas de quienes aceptaron analíticas. Las vistas anónimas cuentan en «Vistas». Ventas: la mayor entre ventas registradas y solicitudes entregadas, sin sumarlas dos veces.</p>
              </>
            ) : <Empty />}
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Por categoría">
              <SummaryTable rows={data.byCategory} />
            </Card>
            <Card title="Por promoción">
              <SummaryTable rows={data.byPromotion} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Interés sin stock" note="Productos vistos o pedidos que ya no están disponibles: oportunidades de reposición.">
              {data.interestWithoutStock.length ? (
                <ul className="divide-y text-sm">
                  {data.interestWithoutStock.map((item: any) => (
                    <li key={item.id} className="flex justify-between gap-3 py-2"><span className="min-w-0 truncate">{item.title}</span><span className="shrink-0 tabular-nums text-gray-600">{fmt(item.views)} vistas · {fmt(item.interest)} interés</span></li>
                  ))}
                </ul>
              ) : <Empty text="Ningún producto sin stock recibió interés en este periodo." />}
            </Card>
            <Card title="Publicados sin movimiento" note="Con stock, pero sin vistas en el periodo.">
              {data.withoutMovement.length ? (
                <ul className="divide-y text-sm">
                  {data.withoutMovement.map((item: any) => (
                    <li key={item.id} className="flex justify-between gap-3 py-2"><span className="min-w-0 truncate">{item.title}</span><span className="shrink-0 text-xs text-gray-500">{item.sku}</span></li>
                  ))}
                </ul>
              ) : <Empty text="Todos los productos publicados recibieron vistas." />}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryTable({ rows }: { rows: any[] }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500">
            <th className="py-2 pr-2 font-medium">Grupo</th>
            <th className="px-2 text-right font-medium">Vistas</th>
            <th className="px-2 text-right font-medium">Interés</th>
            <th className="px-2 text-right font-medium">Solicitudes</th>
            <th className="px-2 text-right font-medium">Ventas</th>
            <th className="px-2 text-right font-medium">Vista→venta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b last:border-0">
              <td className="py-2 pr-2 capitalize">{row.key}</td>
              <td className="px-2 text-right tabular-nums">{fmt(row.views)}</td>
              <td className="px-2 text-right tabular-nums">{fmt(row.interest)}</td>
              <td className="px-2 text-right tabular-nums">{fmt(row.requests)}</td>
              <td className="px-2 text-right tabular-nums">{fmt(row.sold)}</td>
              <td className="px-2 text-right tabular-nums">{pctText(row.salePerView)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SearchesTab({ from, to }: { from: string; to: string }) {
  const state = useLoad<any>(() => searchesAction(from, to), [from, to]);
  const data = state.data;
  return (
    <div className="space-y-4">
      <Status loading={state.loading} error={state.error} />
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Lo más buscado">
              <RankBars rows={data.top.slice(0, 15).map((row: any) => ({ label: row.query, value: row.n, note: row.zero ? `(${row.zero} sin resultados)` : undefined }))} unit="búsquedas" />
            </Card>
            <Card title="Búsquedas sin resultados" note="Lo que tus clientes buscan y hoy no encuentran.">
              <RankBars rows={data.zero.slice(0, 15).map((row: any) => ({ label: row.query, value: row.n }))} unit="búsquedas" />
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Modelos buscados">
              <RankBars rows={data.models.map((row: any) => ({ label: row.key, value: row.n }))} unit="búsquedas" />
            </Card>
            <Card title="Capacidades buscadas">
              <RankBars rows={data.storage.map((row: any) => ({ label: row.key, value: row.n }))} unit="búsquedas" />
            </Card>
            <Card title="Filtros más usados">
              <RankBars rows={data.filters.map((row: any) => ({ label: row.filter, value: row.n }))} unit="usos" />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FunnelTab({ from, to }: { from: string; to: string }) {
  const state = useLoad<any>(() => funnelAction(from, to), [from, to]);
  const data = state.data;
  const max = data ? Math.max(1, ...data.stages.map((s: any) => s.n)) : 1;
  return (
    <div className="space-y-4">
      <Status loading={state.loading} error={state.error} />
      {data && (
        <Card title="Embudo comercial" note="Un clic en WhatsApp es interés, no una venta. Las ventas son solicitudes entregadas.">
          <ol className="space-y-3">
            {data.stages.map((stage: any) => (
              <li key={stage.key}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-gray-900">{stage.label} <span className="font-normal text-gray-500">· {stage.note}</span></span>
                  <span className="tabular-nums">
                    <strong>{fmt(stage.n)}</strong>
                    {stage.fromPrevious !== null && <span className="ml-2 text-xs text-gray-600">{pctText(stage.fromPrevious)} de la etapa anterior</span>}
                  </span>
                </div>
                <div className="mt-1 h-7 rounded-lg bg-gray-100" title={`${stage.label}: ${fmt(stage.n)}`}>
                  <div className="h-7 rounded-lg" style={{ width: `${Math.max(stage.n ? 1.5 : 0, (stage.n / max) * 100)}%`, background: "#2a78d6" }} />
                </div>
                {stage.lost ? <div className="mt-0.5 text-xs text-gray-500">Se perdieron {fmt(stage.lost)} respecto de la etapa anterior</div> : null}
              </li>
            ))}
          </ol>
          {data.biggestDrop && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Mayor pérdida: de la etapa anterior a <strong>{data.biggestDrop.label}</strong> solo pasa el {pctText(data.biggestDrop.fromPrevious)}.
            </p>
          )}
          <p className="mt-3 text-xs text-gray-500">
            Además, en el panel se registraron {fmt(data.salesRecorded.n)} ventas por {money(data.salesRecorded.amount)} en este periodo (incluye ventas que no pasaron por la web).
          </p>
        </Card>
      )}
    </div>
  );
}

function SourcesTab({ from, to }: { from: string; to: string }) {
  const state = useLoad<any>(() => sourcesAction(from, to), [from, to]);
  const data = state.data;
  return (
    <div className="space-y-4">
      <Status loading={state.loading} error={state.error} />
      {data && (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="¿De dónde llegan?" note="Por la primera página de cada visita.">
              <RankBars rows={data.sources.map((row: any) => ({ label: SOURCE_LABELS[row.source] || row.source, value: row.visits, note: row.share !== null ? `(${row.share}%)` : undefined }))} unit="visitas" />
            </Card>
            <Card title="Sitios que te enlazan">
              <RankBars rows={data.referrers.map((row: any) => ({ label: row.referrer_host, value: row.visits }))} unit="visitas" />
            </Card>
          </div>
          <Card title="Campañas (UTM y anuncios)" note="Lo que hicieron después las sesiones de cada campaña (solo de quienes aceptaron analíticas).">
            {data.campaigns.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-gray-500">
                      <th className="py-2 pr-2 font-medium">Fuente / medio / campaña</th>
                      <th className="px-2 text-right font-medium">Visitas</th>
                      <th className="px-2 text-right font-medium">Sesiones</th>
                      <th className="px-2 text-right font-medium">Vistas de producto</th>
                      <th className="px-2 text-right font-medium">Interés</th>
                      <th className="px-2 text-right font-medium">Solicitudes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.campaigns.map((row: any, i: number) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-2">{[row.utm_source || "—", row.utm_medium, row.utm_campaign].filter(Boolean).join(" / ")}</td>
                        <td className="px-2 text-right tabular-nums">{fmt(row.visits)}</td>
                        <td className="px-2 text-right tabular-nums">{fmt(row.sessions)}</td>
                        <td className="px-2 text-right tabular-nums">{fmt(row.product_views)}</td>
                        <td className="px-2 text-right tabular-nums">{fmt(row.interest)}</td>
                        <td className="px-2 text-right tabular-nums">{fmt(row.requests)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty text="No hubo visitas desde campañas en este periodo. Usa enlaces con ?utm_source=…&utm_campaign=… en tus anuncios." />}
          </Card>
        </>
      )}
    </div>
  );
}
