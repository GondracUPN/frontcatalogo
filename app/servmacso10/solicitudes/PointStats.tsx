"use client";

import React from "react";
import { deliveryStatsAction } from "./actions";
import { formatMoney } from "./status";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const RANGES: Array<{ days: number; label: string }> = [
  { days: 30, label: "30 días" },
  { days: 90, label: "90 días" },
  { days: 365, label: "12 meses" },
];

export default function PointStats() {
  const [days, setDays] = React.useState(90);
  const [data, setData] = React.useState<any | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const to = new Date();
    const from = new Date(to.getTime() - days * 864e5);
    deliveryStatsAction(from.toISOString(), to.toISOString()).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) setData(result.data);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const rows = (data?.items || []).filter((item: any) => item.chosen || item.delivered || item.historicalSales);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {RANGES.map((range) => (
          <button key={range.days} type="button" onClick={() => setDays(range.days)} className={`min-h-10 rounded-full px-3 text-sm ${days === range.days ? "bg-gray-900 font-semibold text-white" : "border border-gray-300 bg-white"}`}>
            {range.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-600">
        <strong>Elegidos</strong>: solicitudes que eligieron el punto. <strong>Programados</strong>: confirmados y en curso. <strong>Entregados</strong>: estado «Entregada».
        <strong> Ventas registradas</strong>: ventas del historial anterior cuyo lugar coincide con el punto.
      </p>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {loading && <div role="status" className="text-sm text-gray-500">Cargando…</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">Aún no hay solicitudes ni ventas con punto de entrega en este periodo.</div>
      )}
      <ul className="grid gap-2 md:grid-cols-2">
        {rows.map((item: any) => {
          const maxWeekday = Math.max(1, ...item.weekdays);
          const months = Object.entries(item.monthly || {}).sort(([a], [b]) => a.localeCompare(b));
          return (
            <li key={item.pointId} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{item.name}</h3>
                <span className="text-xs text-gray-500">{item.deliveredShare}% de entregas</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-gray-50 p-2"><dt className="text-xs text-gray-500">Elegidos</dt><dd className="text-lg font-semibold">{item.chosen}</dd></div>
                <div className="rounded-lg bg-gray-50 p-2"><dt className="text-xs text-gray-500">Programados</dt><dd className="text-lg font-semibold">{item.scheduled}</dd></div>
                <div className="rounded-lg bg-gray-50 p-2"><dt className="text-xs text-gray-500">Entregados</dt><dd className="text-lg font-semibold">{item.delivered}</dd></div>
              </dl>
              <div className="mt-3 grid gap-1 text-sm">
                <div>Ingresos entregados: <strong>{formatMoney(item.deliveredRevenue)}</strong></div>
                {item.deliveryCosts > 0 && <div>Costos de entrega: {formatMoney(item.deliveryCosts)} · Margen: {formatMoney(item.deliveryMargin)}</div>}
                {item.historicalSales > 0 && <div>Ventas registradas: {item.historicalSales} · {formatMoney(item.historicalRevenue)}</div>}
                {item.topProducts.length > 0 && <div className="text-xs text-gray-600">Más entregados: {item.topProducts.map((p: any) => `${p.title} (${p.qty})`).join(", ")}</div>}
              </div>
              {item.delivered > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-gray-500">Entregas por día de la semana</div>
                  <div className="mt-1 flex h-14 items-end gap-1" aria-label="Entregas por día de la semana">
                    {item.weekdays.map((n: number, index: number) => (
                      <div key={index} className="flex flex-1 flex-col items-center gap-0.5">
                        <div className="w-full rounded-t bg-gray-800" style={{ height: `${Math.max(2, (n / maxWeekday) * 40)}px` }} title={`${WEEKDAYS[index]}: ${n}`} />
                        <span className="text-[10px] text-gray-500">{WEEKDAYS[index]}</span>
                      </div>
                    ))}
                  </div>
                  {months.length > 1 && <div className="mt-2 text-xs text-gray-600">Por mes: {months.map(([month, n]) => `${month}: ${n}`).join(" · ")}</div>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
