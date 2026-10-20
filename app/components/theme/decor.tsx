// Ilustraciones SVG de las temáticas: livianas (sin imágenes ni librerías),
// nítidas en cualquier pantalla y sin depender de los emojis del sistema.
import React from "react";
import CuteSpider from "./CuteSpider";

type Props = { className?: string; style?: React.CSSProperties };

// ---------- Formas básicas (partículas y adornos) ----------
export function Snowflake({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M12 5l-2-2M12 5l2-2M12 19l-2 2M12 19l2 2M6 8.5L3.6 8M6 8.5L5.3 6M18 15.5l2.4.5M18 15.5l.7 2.5M6 15.5l-2.4.5M6 15.5l-.7 2.5M18 8.5l2.4-.5M18 8.5l.7-2.5" />
    </svg>
  );
}

export function Heart({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <path fill="currentColor" d="M12 21s-7.6-4.7-9.6-9.4C1 8.3 3.3 4.8 6.8 4.8c2 0 3.6 1.1 5.2 3 1.6-1.9 3.2-3 5.2-3 3.5 0 5.8 3.5 4.4 6.8C19.6 16.3 12 21 12 21z" />
      <path fill="#fff" opacity=".35" d="M7 7.3c-1.6.2-2.6 1.6-2.4 3 .4-1.2 1.3-2 2.6-2.3z" />
    </svg>
  );
}

export function Bat({ className, style }: Props) {
  return (
    <svg viewBox="0 0 32 16" className={className} style={style}>
      <path fill="currentColor" d="M16 4c-.9 0-1.5.5-1.8 1.2L13 3.6c.1 1.6-.6 2.9-2 3.3C10.3 5 8.6 4.2 6.8 4.4 4.8 4.6 2.7 6 1 8.4c2.2-.6 4.2-.2 5.4 1 1.4-1 3.5-1 4.8.4.8-1.1 2.2-1.8 3.4-1.4.4.4.9.6 1.4.6s1-.2 1.4-.6c1.2-.4 2.6.3 3.4 1.4 1.3-1.4 3.4-1.4 4.8-.4 1.2-1.2 3.2-1.6 5.4-1-1.7-2.4-3.8-3.8-5.8-4-1.8-.2-3.5.6-4.2 2.5-1.4-.4-2.1-1.7-2-3.3l-1.2 1.6C17.5 4.5 16.9 4 16 4z" />
    </svg>
  );
}

export function Pumpkin({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <path d="M12 6.5c0-2 .9-3.4 2.8-4.1" stroke="#3f6212" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      <ellipse cx="7.5" cy="14" rx="5.5" ry="7" fill="#ea580c" />
      <ellipse cx="16.5" cy="14" rx="5.5" ry="7" fill="#ea580c" />
      <ellipse cx="12" cy="14" rx="4.6" ry="7.4" fill="#f97316" />
      <path d="M8.6 12.2l1.6-1.8 1.4 1.8zM12.4 12.2l1.6-1.8 1.4 1.8z" fill="#422006" />
      <path d="M8.8 15.6c1.2 1.4 5.2 1.4 6.4 0l-1 .3-.8-.7-.8.8-.8-.8-.8.8-.8-.8-.8.7z" fill="#422006" />
    </svg>
  );
}

export function Star({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <path fill="currentColor" d="M12 2.5l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.8 6.2 20l1.4-6.4L2.7 9.2l6.5-.7z" />
    </svg>
  );
}

export function Flower({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="12" cy="6.6" rx="3.6" ry="5" fill="currentColor" transform={`rotate(${angle} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="3" fill="#fde68a" />
    </svg>
  );
}

export function PeruFlag({ className, style }: Props) {
  return (
    <svg viewBox="0 0 30 20" className={className} style={style}>
      <rect width="10" height="20" fill="#d91023" />
      <rect x="10" width="10" height="20" fill="#ffffff" />
      <rect x="20" width="10" height="20" fill="#d91023" />
      <rect width="30" height="20" fill="none" stroke="rgba(0,0,0,.12)" />
    </svg>
  );
}

export function Escarapela({ className, style }: Props) {
  return (
    <svg viewBox="0 0 40 52" className={className} style={style}>
      <path d="M13 30l-6 20 7-4 4 6 3-20zM27 30l6 20-7-4-4 6-3-20z" fill="#d91023" />
      {Array.from({ length: 16 }, (_, i) => (
        <ellipse key={i} cx="20" cy="9" rx="4" ry="8" fill={i % 2 ? "#ffffff" : "#d91023"} stroke="rgba(0,0,0,.08)" transform={`rotate(${i * 22.5} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="7" fill="#d91023" />
      <circle cx="20" cy="20" r="4" fill="#ffffff" />
    </svg>
  );
}

export function Bauble({ color, className, style }: Props & { color: string }) {
  return (
    <svg viewBox="0 0 24 30" className={className} style={style}>
      <rect x="9" y="1" width="6" height="5" rx="1" fill="#d4a017" />
      <circle cx="12" cy="17" r="11" fill={color} />
      <path d="M4 15c4 2.5 12 2.5 16 0" stroke="#ffffff" strokeOpacity=".55" strokeWidth="1.4" fill="none" />
      <ellipse cx="8" cy="12.5" rx="2.4" ry="3.6" fill="#ffffff" opacity=".35" transform="rotate(25 8 12.5)" />
    </svg>
  );
}

// ---------- Icono de la temática (aviso superior) ----------
export function ThemeIcon({ preset, className }: { preset: string; className?: string }) {
  switch (preset) {
    case "navidad":
      return <Bauble color="#dc2626" className={className} />;
    case "ano_nuevo":
    case "aniversario":
      return <Star className={className} style={{ color: "#fbbf24" }} />;
    case "san_valentin":
      return <Heart className={className} style={{ color: "#f43f5e" }} />;
    case "halloween":
      return <Pumpkin className={className} />;
    case "fiestas_patrias":
      return <Escarapela className={className} />;
    case "dia_madre":
      return <Flower className={className} style={{ color: "#f472b6" }} />;
    case "dia_padre":
      return <Star className={className} style={{ color: "#93c5fd" }} />;
    case "verano":
      return <Sun className={className} />;
    default:
      return <Star className={className} style={{ color: "currentColor" }} />;
  }
}

export function Sun({ className, style }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <g stroke="#f59e0b" strokeWidth={2} strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d="M12 1.8v3" transform={`rotate(${i * 45} 12 12)`} />
        ))}
      </g>
      <circle cx="12" cy="12" r="5.4" fill="#fbbf24" />
    </svg>
  );
}

// ---------- Guirnalda en el borde superior del bloque principal ----------
const BUNTING_COLORS: Record<string, string[]> = {
  fiestas_patrias: ["#d91023", "#ffffff"],
  escolar: ["#0ea5e9", "#facc15", "#22c55e", "#f97316"],
  aniversario: ["#2563eb", "#f59e0b", "#ec4899", "#10b981"],
  dia_padre: ["#1e3a8a", "#93c5fd"],
  black_friday: ["#111827", "#facc15"],
  cyber_days: ["#7c3aed", "#22d3ee"],
  custom: [],
};

// Dos arcos que cuelgan: el cable cae `sag` px en el centro de cada mitad.
function wire(width: number, sag: number) {
  return `M0 4 Q ${width / 4} ${4 + 2 * sag} ${width / 2} 4 Q ${(3 * width) / 4} ${4 + 2 * sag} ${width} 4`;
}

function pointOnWire(t: number, width: number, sag: number) {
  const local = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return { x: t * width, y: 4 + 4 * sag * local * (1 - local) };
}

export function Garland({ preset, accent }: { preset: string; accent: string }) {
  const width = 1000;
  const sag = 22;
  const count = 22;
  const points = Array.from({ length: count }, (_, i) => pointOnWire((i + 0.5) / count, width, sag));

  if (preset === "halloween") {
    return (
      <svg aria-hidden="true" viewBox="0 0 160 160" className="pointer-events-none absolute right-0 top-0 h-28 w-28 text-slate-400 sm:h-44 sm:w-44">
        <g stroke="currentColor" strokeWidth="1.1" fill="none" opacity=".9">
          {[0, 20, 40, 60, 80].map((angle) => (
            <path key={angle} d={`M160 0 L${160 - 160 * Math.cos((angle * Math.PI) / 180)} ${160 * Math.sin((angle * Math.PI) / 180)}`} />
          ))}
          {[30, 55, 80, 105, 130].map((r) => (
            <path key={r} d={`M${160 - r} 0 Q ${160 - r * 0.8} ${r * 0.28} ${160 - r * 0.94} ${r * 0.34} Q ${160 - r * 0.72} ${r * 0.56} ${160 - r * 0.77} ${r * 0.64} Q ${160 - r * 0.5} ${r * 0.74} ${160 - r * 0.5} ${r * 0.87} Q ${160 - r * 0.26} ${r * 0.88} ${160 - r * 0.17} ${r * 0.98} Q ${160 - r * 0.06} ${r * 0.95} 160 ${r}`} />
          ))}
        </g>
        <CuteSpider x={118} y={80} scale={0.32} thread={80 / 0.32} />
      </svg>
    );
  }

  if (preset === "navidad" || preset === "ano_nuevo") {
    const colors = preset === "navidad" ? ["#ef4444", "#22c55e", "#facc15", "#3b82f6"] : ["#facc15", "#fde68a", "#f59e0b", "#ffffff"];
    return (
      <svg aria-hidden="true" viewBox={`0 0 ${width} 60`} preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 h-10 w-full sm:h-14">
        <path d={wire(width, sag)} stroke="#334155" strokeWidth="2" fill="none" />
        {points.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <rect x="-2.5" y="0" width="5" height="5" rx="1" fill="#475569" />
            <ellipse cx="0" cy="11" rx="5" ry="7" fill={colors[i % colors.length]} className="ms-twinkle" style={{ animationDelay: `${(i % 5) * 0.4}s` }} />
          </g>
        ))}
      </svg>
    );
  }

  if (preset === "san_valentin" || preset === "dia_madre") {
    const Shape = preset === "san_valentin" ? Heart : Flower;
    const colors = preset === "san_valentin" ? ["#e11d48", "#fb7185", "#be123c"] : ["#ec4899", "#f9a8d4", "#db2777"];
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-10 sm:h-14">
        <svg viewBox={`0 0 ${width} 60`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d={wire(width, sag)} stroke="#e5a3b6" strokeWidth="1.5" fill="none" strokeDasharray="4 4" />
        </svg>
        {points.filter((_, i) => i % 2 === 0).map((p, i) => (
          <Shape key={i} className="absolute h-4 w-4 -translate-x-1/2 sm:h-5 sm:w-5" style={{ left: `${(p.x / width) * 100}%`, top: `${(p.y / 60) * 100}%`, color: colors[i % colors.length] }} />
        ))}
      </div>
    );
  }

  if (preset === "verano") {
    return <Sun className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 opacity-90 ms-spin-slow sm:h-36 sm:w-36" />;
  }

  // Banderines (Fiestas Patrias, campañas y personalizadas)
  const palette = BUNTING_COLORS[preset]?.length ? BUNTING_COLORS[preset] : [accent, "#ffffff"];
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${width} 70`} preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 h-12 w-full sm:h-16">
      <path d={wire(width, sag)} stroke="#64748b" strokeWidth="1.5" fill="none" />
      {points.map((p, i) => (
        <path
          key={i}
          d={`M${p.x - 18} ${p.y} L${p.x + 18} ${p.y} L${p.x} ${p.y + 34} Z`}
          fill={palette[i % palette.length]}
          stroke="rgba(15,23,42,.12)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
