"use client";
import React from "react";
import {
  salesSummaryAction,
  salesTimelineAction,
  salesProductsAction,
  salesChannelsAction,
  salesStockAction,
  sellersAction,
} from "./actions";
import { LineChart, RankBars, Empty, fmt } from "./charts";
import { bucketLabel, type Group } from "./period";
import { formatLimaDateTime } from "@/lib/lima-date";
import type {
  Metric,
  SalesSummary,
  SalesTimeline,
  SalesProducts,
  SalesChannels,
  SalesStock,
  SellerRow,
} from "./sales-types";

const money = (value: number) =>
  `S/ ${Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const delta = (change: number | null) =>
  change === null
    ? "Sin base anterior"
    : `${change > 0 ? "+" : ""}${change.toLocaleString("es-PE")}% vs. periodo anterior`;

function Card({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {note && <p className="mt-1 text-xs text-gray-500">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
function Kpi({
  label,
  value,
  format = fmt,
}: {
  label: string;
  value: Metric;
  format?: (value: number) => string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold tabular-nums text-gray-900">
        {format(value.current)}
      </p>
      <p className="mt-2 text-xs text-gray-500">{delta(value.change)}</p>
      <p className="mt-1 text-xs text-gray-400">
        Antes: {format(value.previous)}
      </p>
    </div>
  );
}

export function SalesTab({
  from,
  to,
  group,
  isAdmin,
  owner,
  onOwner,
}: {
  from: string;
  to: string;
  group: Group;
  isAdmin: boolean;
  owner: string;
  onOwner: (owner: string) => void;
}) {
  const [sellers, setSellers] = React.useState<SellerRow[]>([]);
  const [state, setState] = React.useState<{
    loading: boolean;
    error: string;
    data: null | {
      summary: SalesSummary;
      timeline: SalesTimeline;
      products: SalesProducts;
      channels: SalesChannels;
      stock: SalesStock;
    };
  }>({ loading: true, error: "", data: null });
  const [series, setSeries] = React.useState<"revenue" | "sales">("revenue");
  React.useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    sellersAction(from, to).then((result) => {
      if (active && result.ok) setSellers(result.data.items);
    });
    return () => {
      active = false;
    };
  }, [isAdmin, from, to]);
  React.useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", data: null });
    Promise.all([
      salesSummaryAction(from, to, owner),
      salesTimelineAction(from, to, owner, group),
      salesProductsAction(from, to, owner),
      salesChannelsAction(from, to, owner),
      salesStockAction(owner),
    ])
      .then(([summary, timeline, products, channels, stock]) => {
        if (!active) return;
        if (
          !summary.ok ||
          !timeline.ok ||
          !products.ok ||
          !channels.ok ||
          !stock.ok
        ) {
          const failed = [summary, timeline, products, channels, stock].find(
            (result) => !result.ok,
          );
          setState({
            loading: false,
            error:
              failed && !failed.ok
                ? failed.error
                : "No se pudieron calcular las ventas",
            data: null,
          });
          return;
        }
        setState({
          loading: false,
          error: "",
          data: {
            summary: summary.data,
            timeline: timeline.data,
            products: products.data,
            channels: channels.data,
            stock: stock.data,
          },
        });
      })
      .catch(() => {
        if (active)
          setState({
            loading: false,
            error: "No se pudo conectar con el servidor",
            data: null,
          });
      });
    return () => {
      active = false;
    };
  }, [from, to, group, owner]);
  const data = state.data;
  return (
    <div className="min-w-0 space-y-4">
      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <label className="grid min-w-0 gap-1 text-xs text-gray-600">
            Ventas de
            <select
              aria-label="Ventas de"
              value={owner}
              onChange={(e) => onOwner(e.target.value)}
              className="min-h-11 w-full max-w-full rounded-lg border border-gray-300 bg-white px-3 text-sm"
            >
              <option value="macsomenos">Macsomenos</option>
              {sellers.map((seller) => (
                <option key={seller.owner_id} value={String(seller.owner_id)}>
                  {seller.username}
                </option>
              ))}
              <option value="all">Todos · consolidado</option>
            </select>
          </label>
          <a
            className="rounded-lg px-3 py-3 text-sm font-medium text-blue-700 hover:bg-blue-50"
            href={`/servmacso10/servicios?owner=${encodeURIComponent(owner)}`}
          >
            Ver registros en Vendidos →
          </a>
        </div>
      )}
      {state.loading && (
        <div role="status" className="p-5 text-sm text-gray-500">
          Calculando ventas…
        </div>
      )}
      {state.error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}
      {data && (
        <>
          {data.summary.sales.current === 0 && (
            <Empty
              text={
                isAdmin
                  ? "No hay ventas en este periodo para el alcance elegido"
                  : "Aún no tienes ventas en este periodo"
              }
            />
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Ventas" value={data.summary.sales} />
            <Kpi label="Ingresos" value={data.summary.revenue} format={money} />
            <Kpi
              label="Ticket medio"
              value={data.summary.averageTicket}
              format={money}
            />
            <Kpi
              label="Solicitudes entregadas"
              value={data.summary.conversion}
              format={(value) =>
                `${value.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Ingresos con tipo de cambio">
              <p className="text-2xl font-semibold text-gray-900">
                US${" "}
                {data.summary.revenueUsd.current.toLocaleString("es-PE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {data.summary.exchangeRateCoverage.sales} de{" "}
                {data.summary.exchangeRateCoverage.total} ventas tienen tipo de
                cambio registrado. La suma excluye las restantes.
              </p>
            </Card>
            <Card title="Margen">
              <p className="text-lg font-semibold text-gray-700">
                No disponible
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {data.summary.marginReason}
              </p>
            </Card>
          </div>
          <Card
            title="Evolución de ventas"
            note="Fechas agrupadas en hora de Lima."
          >
            <label className="mb-3 flex items-center gap-2 text-xs text-gray-500">
              Mostrar
              <select
                aria-label="Métrica de ventas"
                value={series}
                onChange={(e) => setSeries(e.target.value as typeof series)}
                className="rounded-lg border border-gray-200 p-2"
              >
                <option value="revenue">Ingresos</option>
                <option value="sales">Ventas</option>
              </select>
            </label>
            <LineChart
              labels={data.timeline.items.map((row) =>
                bucketLabel(row.bucket, group, true),
              )}
              values={data.timeline.items.map((row) => Number(row[series]))}
              unit={series === "revenue" ? "S/" : "ventas"}
            />
          </Card>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2">
            <Card title="Modelos y categorías">
              <RankBars
                unit="unidades"
                rows={data.products.items.map((row) => ({
                  label: `${row.model} · ${row.category}`,
                  value: row.units,
                  note: `${money(row.revenue)} · ${row.average_days_to_sale === null ? "Sin fecha de publicación" : `${Number(row.average_days_to_sale).toFixed(1)} días hasta vender (${row.dated_sales} ventas con fecha)`}`,
                }))}
              />
            </Card>
            <Card title="Canales y tipo de cliente">
              <RankBars
                unit="ventas"
                rows={data.channels.items.map((row) => ({
                  label: `${row.place_type === "almacen" ? "Almacén" : row.location} · ${row.customer_kind}`,
                  value: row.sales,
                  note: money(row.revenue),
                }))}
              />
            </Card>
          </div>
          <Card title="Inventario publicado" note={data.stock.ageDefinition}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Activos", data.stock.active],
                [
                  "Días de antigüedad media",
                  Math.round(data.stock.averageAgeDays),
                ],
                ["Más de 30 días", data.stock.over30],
                ["Más de 60 días", data.stock.over60],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 divide-y divide-gray-100">
              {data.stock.items.map((item) => (
                <div
                  key={item.id}
                  className="flex min-w-0 items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-medium text-gray-800">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.sku} · alta {formatLimaDateTime(item.created_at)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-800">
                    {Math.floor(Number(item.age_days))} días
                  </span>
                </div>
              ))}
              {data.stock.items.length === 0 && (
                <p className="py-3 text-sm text-gray-500">
                  No hay productos con más de 30 días sin venderse.
                </p>
              )}
            </div>
          </Card>
          <p className="text-xs leading-5 text-gray-500">
            Conversión: {data.summary.conversionDefinition} Solicitudes del
            periodo: {data.summary.requests.current}.
          </p>
        </>
      )}
    </div>
  );
}

export function SellersTab({
  from,
  to,
  onSelect,
}: {
  from: string;
  to: string;
  onSelect: (owner: string) => void;
}) {
  const [state, setState] = React.useState<{
    loading: boolean;
    error: string;
    items: SellerRow[];
  }>({ loading: true, error: "", items: [] });
  React.useEffect(() => {
    let active = true;
    setState({ loading: true, error: "", items: [] });
    sellersAction(from, to)
      .then((result) => {
        if (active)
          setState(
            result.ok
              ? { loading: false, error: "", items: result.data.items }
              : { loading: false, error: result.error, items: [] },
          );
      })
      .catch(() => {
        if (active)
          setState({
            loading: false,
            error: "No se pudieron cargar los vendedores",
            items: [],
          });
      });
    return () => {
      active = false;
    };
  }, [from, to]);
  if (state.loading)
    return (
      <p role="status" className="p-4 text-sm text-gray-500">
        Calculando vendedores…
      </p>
    );
  if (state.error)
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
        {state.error}
      </p>
    );
  return (
    <Card
      title="Ventas por vendedor"
      note="Selecciona un vendedor para abrir sus ventas. Cada comparación usa el periodo anterior de igual duración."
    >
      {!state.items.length ? (
        <Empty text="Aún no hay vendedores independientes registrados" />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-xs text-gray-500">
                  {[
                    "Vendedor",
                    "Ventas",
                    "Ingresos",
                    "Ticket medio",
                    "Activos",
                    "Última venta",
                    "Variación",
                  ].map((label) => (
                    <th key={label} className="p-2 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.items.map((seller) => (
                  <tr
                    key={seller.owner_id}
                    className="border-b border-gray-100 hover:bg-blue-50"
                  >
                    <td className="p-2">
                      <button
                        onClick={() => onSelect(String(seller.owner_id))}
                        className="py-2 text-left font-semibold text-blue-700"
                      >
                        {seller.username}
                      </button>
                    </td>
                    <td className="p-2">{seller.sales}</td>
                    <td className="p-2">{money(seller.revenue)}</td>
                    <td className="p-2">{money(seller.average_ticket)}</td>
                    <td className="p-2">{seller.active}</td>
                    <td className="p-2 text-xs">
                      {formatLimaDateTime(seller.last_sale)}
                    </td>
                    <td className="p-2 text-xs">{delta(seller.change)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {state.items.map((seller) => (
              <button
                key={seller.owner_id}
                onClick={() => onSelect(String(seller.owner_id))}
                className="w-full min-w-0 rounded-xl border border-gray-200 p-4 text-left hover:bg-blue-50"
              >
                <p className="break-words font-semibold text-blue-700">
                  {seller.username} →
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <p>
                    <span className="block text-xs text-gray-500">
                      Ingresos
                    </span>
                    {money(seller.revenue)}
                  </p>
                  <p>
                    <span className="block text-xs text-gray-500">Ventas</span>
                    {seller.sales}
                  </p>
                  <p>
                    <span className="block text-xs text-gray-500">
                      Ticket medio
                    </span>
                    {money(seller.average_ticket)}
                  </p>
                  <p>
                    <span className="block text-xs text-gray-500">Activos</span>
                    {seller.active}
                  </p>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                  Última venta: {formatLimaDateTime(seller.last_sale)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {delta(seller.change)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
