"use client";

import React from "react";

// Gráficos SVG livianos. Paleta validada (modo claro): serie #2a78d6,
// cuadrícula de 1px, línea de 2px, barras de punta redondeada y tooltip al pasar.
const SERIES = "#2a78d6";
const SERIES_SOFT = "#c9dcf5";
const GRID = "#e7e5e4";
const MUTED = "#6b7280";

export const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("es-PE"));

/** Paso «redondo» (1, 2, 5 × 10ⁿ) para que el eje tenga números enteros y parejos. */
function niceStep(raw: number) {
  if (raw <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  for (const step of [1, 2, 5, 10]) if (step * magnitude >= raw) return step * magnitude;
  return 10 * magnitude;
}

function niceMax(value: number, divisions = 4) {
  return niceStep(Math.max(1, value) / divisions) * divisions;
}

type Tip = { x: number; y: number; title: string; value: string } | null;

function Tooltip({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: tip.x, top: tip.y - 8 }}
    >
      <div className="text-gray-500">{tip.title}</div>
      <div className="font-semibold text-gray-900">{tip.value}</div>
    </div>
  );
}

/** Línea temporal con cruz y tooltip. `labels` y `values` tienen la misma longitud. */
export function LineChart({ labels, values, unit, height = 220 }: { labels: string[]; values: number[]; unit: string; height?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(640);
  const [hover, setHover] = React.useState<number | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth || 640));
    observer.observe(el);
    setWidth(el.clientWidth || 640);
    return () => observer.disconnect();
  }, []);

  const pad = { l: 40, r: 12, t: 12, b: 28 };
  const max = niceMax(Math.max(0, ...values));
  const innerW = Math.max(10, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const x = (i: number) => pad.l + (values.length <= 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
  const y = (v: number) => pad.t + innerH - (v / max) * innerH;
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i)} ${y(v)}`).join(" ");
  const area = values.length ? `${path} L${x(values.length - 1)} ${pad.t + innerH} L${x(0)} ${pad.t + innerH} Z` : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const labelEvery = Math.max(1, Math.ceil(values.length / Math.max(2, Math.floor(innerW / 70))));

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const i = values.length <= 1 ? 0 : Math.round(((px - pad.l) / innerW) * (values.length - 1));
    setHover(Math.max(0, Math.min(values.length - 1, i)));
  };

  const tip: Tip = hover !== null && values.length ? { x: x(hover), y: y(values[hover]), title: labels[hover], value: `${fmt(values[hover])} ${unit}` } : null;

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={`Gráfico de ${unit}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-pan-y">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmt(Math.round(t))}</text>
          </g>
        ))}
        {values.map((_, i) => (i % labelEvery === 0 ? (
          <text key={i} x={x(i)} y={height - 8} textAnchor="middle" fontSize="11" fill={MUTED}>{labels[i]}</text>
        ) : null))}
        {area && <path d={area} fill={SERIES} opacity={0.08} />}
        {path && <path d={path} fill="none" stroke={SERIES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {hover !== null && values.length > 0 && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + innerH} stroke={MUTED} strokeWidth={1} />
            <circle cx={x(hover)} cy={y(values[hover])} r={5} fill={SERIES} stroke="#ffffff" strokeWidth={2} />
          </g>
        )}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

/** Columnas verticales (horas, días). Resalta la mayor. */
export function ColumnChart({ labels, values, unit, height = 180, highlightMax = true }: { labels: string[]; values: number[]; unit: string; height?: number; highlightMax?: boolean }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(480);
  const [hover, setHover] = React.useState<number | null>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setWidth(el.clientWidth || 480));
    observer.observe(el);
    setWidth(el.clientWidth || 480);
    return () => observer.disconnect();
  }, []);
  const pad = { l: 34, r: 6, t: 10, b: 24 };
  const max = niceMax(Math.max(0, ...values), 2);
  const innerW = Math.max(10, width - pad.l - pad.r);
  const innerH = height - pad.t - pad.b;
  const slot = innerW / Math.max(1, values.length);
  const barW = Math.min(24, Math.max(4, slot - 4));
  const peak = highlightMax ? values.indexOf(Math.max(...values)) : -1;
  const labelEvery = Math.max(1, Math.ceil(values.length / Math.max(2, Math.floor(innerW / 34))));
  const tip: Tip = hover !== null ? { x: pad.l + slot * hover + slot / 2, y: pad.t + innerH - (values[hover] / max) * innerH, title: labels[hover], value: `${fmt(values[hover])} ${unit}` } : null;

  return (
    <div ref={ref} className="relative w-full">
      <svg width={width} height={height} role="img" aria-label={`Gráfico de ${unit}`} className="block">
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={pad.l} x2={width - pad.r} y1={pad.t + innerH - f * innerH} y2={pad.t + innerH - f * innerH} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 6} y={pad.t + innerH - f * innerH + 4} textAnchor="end" fontSize="11" fill={MUTED}>{fmt(Math.round(f * max))}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const h = (v / max) * innerH;
          const bx = pad.l + slot * i + (slot - barW) / 2;
          const by = pad.t + innerH - h;
          const r = Math.min(4, h / 2, barW / 2);
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={innerH} fill="transparent" />
              {h > 0 && (
                <path
                  d={`M${bx} ${pad.t + innerH} V${by + r} Q${bx} ${by} ${bx + r} ${by} H${bx + barW - r} Q${bx + barW} ${by} ${bx + barW} ${by + r} V${pad.t + innerH} Z`}
                  fill={i === peak || hover === i ? SERIES : SERIES_SOFT}
                />
              )}
              {i % labelEvery === 0 && <text x={pad.l + slot * i + slot / 2} y={height - 6} textAnchor="middle" fontSize="11" fill={MUTED}>{labels[i]}</text>}
            </g>
          );
        })}
      </svg>
      <Tooltip tip={tip} />
    </div>
  );
}

/** Ranking horizontal (categorías, búsquedas, procedencias). */
export function RankBars({ rows, unit }: { rows: Array<{ label: string; value: number; note?: string }>; unit: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (!rows.length) return <Empty />;
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label} title={`${row.label}: ${fmt(row.value)} ${unit}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-gray-800">{row.label}</span>
            <span className="shrink-0 tabular-nums text-gray-900">{fmt(row.value)}{row.note ? <span className="ml-1 text-xs text-gray-500">{row.note}</span> : null}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full" style={{ width: `${(row.value / max) * 100}%`, background: SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Empty({ text = "Aún no hay datos en este periodo." }: { text?: string }) {
  return <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{text}</div>;
}
