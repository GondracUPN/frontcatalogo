// Motivos gráficos de campaña: SVG de línea, sin emojis ni ilustraciones
// infantiles. Son decorativos (aria-hidden), no capturan clics y no se animan.
import type { CampaignMotif } from "@/lib/campaigns";

type Props = { color: string; className?: string };

/** Cinta de regalo que cruza la esquina de una tarjeta, con lazo. */
export function Ribbon({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={`pointer-events-none ${className}`}>
      <rect x="128" y="0" width="22" height="200" fill={color} />
      <rect x="0" y="54" width="200" height="22" fill={color} />
      <rect x="128" y="0" width="5" height="200" fill="#000" opacity=".12" />
      <path d="M139 65 C112 34 92 40 98 58 C103 72 124 70 139 65 Z" fill={color} stroke="#000" strokeOpacity=".15" />
      <path d="M139 65 C168 36 188 44 181 61 C175 74 154 71 139 65 Z" fill={color} stroke="#000" strokeOpacity=".15" />
      <path d="M139 65 L122 104 L131 100 L136 110 Z M139 65 L158 103 L149 99 L144 109 Z" fill={color} />
      <circle cx="139" cy="65" r="8" fill={color} stroke="#000" strokeOpacity=".2" />
    </svg>
  );
}

/** Destello de cuatro puntas (Año Nuevo). */
export function Sparkle({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className={`pointer-events-none ${className}`}>
      <path d="M20 0 C21 13 27 19 40 20 C27 21 21 27 20 40 C19 27 13 21 0 20 C13 19 19 13 20 0 Z" fill={color} />
    </svg>
  );
}

/** Corazón de un solo trazo. */
export function HeartLine({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 200" className={`pointer-events-none ${className}`}>
      <path d="M110 182 C60 140 14 108 14 62 C14 32 38 12 64 12 C86 12 101 24 110 42 C119 24 134 12 156 12 C182 12 206 32 206 62 C206 108 160 140 110 182 Z" fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

/** Luna creciente con aro fino. */
export function Moon({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={`pointer-events-none ${className}`}>
      <circle cx="100" cy="100" r="92" fill="none" stroke={color} strokeOpacity=".25" strokeWidth="1.5" />
      <path d="M128 30 A72 72 0 1 0 170 132 A58 58 0 1 1 128 30 Z" fill={color} opacity=".9" />
    </svg>
  );
}

/** Greca escalonada andina, como banda horizontal repetible (24 px de alto). */
export function AndeanBand({ color, className = "" }: Props) {
  const id = `ms-andean-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg aria-hidden="true" height="24" className={`pointer-events-none ${className}`}>
      <defs>
        <pattern id={id} width="48" height="24" patternUnits="userSpaceOnUse">
          <path d="M0 24 V18 H6 V12 H12 V6 H18 V0 H30 V6 H36 V12 H42 V18 H48 V24 Z" fill={color} />
        </pattern>
      </defs>
      <rect width="100%" height="24" fill={`url(#${id})`} />
    </svg>
  );
}

/** Rama floral de línea (Día de la Madre). */
export function Petal({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 220" className={`pointer-events-none ${className}`}>
      <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M80 214 C78 160 84 110 104 60" />
        <path d="M82 150 C60 140 46 120 44 98 C66 104 80 122 82 150 Z" />
        <path d="M90 112 C110 104 126 88 128 66 C106 72 92 90 90 112 Z" />
        <circle cx="106" cy="42" r="16" />
        <path d="M106 26 C100 14 112 8 106 26 M122 42 C134 36 140 48 122 42 M106 58 C112 70 100 76 106 58 M90 42 C78 48 72 36 90 42" />
      </g>
    </svg>
  );
}

/** Líneas finas paralelas (Día del Padre). */
export function Pinstripe({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 120" className={`pointer-events-none ${className}`}>
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} x1={i * 10} y1="120" x2={i * 10 + 60} y2="0" stroke={color} strokeWidth="1.2" />
      ))}
    </svg>
  );
}

/** Retícula digital con nodos (Cyber Days). */
export function GridGlow({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={`pointer-events-none ${className}`}>
      <defs>
        <pattern id="ms-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0 H0 V40" fill="none" stroke={color} strokeOpacity=".35" strokeWidth="1" />
        </pattern>
        <radialGradient id="ms-grid-fade" cx="70%" cy="40%" r="70%">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="ms-grid-mask"><rect width="400" height="300" fill="url(#ms-grid-fade)" /></mask>
      </defs>
      <rect width="400" height="300" fill="url(#ms-grid)" mask="url(#ms-grid-mask)" />
      {[[280, 80], [320, 160], [200, 120], [360, 40]].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x - 3} y={y - 3} width="6" height="6" fill={color} />
      ))}
    </svg>
  );
}

/** Sol de líneas (Verano). */
export function SunLines({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={`pointer-events-none ${className}`}>
      <circle cx="100" cy="100" r="54" fill={color} />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <line key={i} x1={100 + Math.cos(a) * 66} y1={100 + Math.sin(a) * 66} x2={100 + Math.cos(a) * 90} y2={100 + Math.sin(a) * 90} stroke={color} strokeWidth="4" strokeLinecap="round" />;
      })}
    </svg>
  );
}

/** Hoja de Macsomenos (aniversario). */
export function Leaf({ color, className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="495 180 200 215" className={`pointer-events-none ${className}`}>
      <path fill={color} d="M507 384 C500 295 560 205 680 188 C686 290 625 372 507 384 Z" />
    </svg>
  );
}

/** Icono pequeño del motivo para el aviso superior y las etiquetas. */
export function MotifGlyph({ motif, color = "currentColor", className = "h-4 w-4" }: { motif: CampaignMotif; color?: string; className?: string }) {
  switch (motif) {
    case "ribbon":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round">
          <rect x="3" y="9" width="18" height="12" rx="1.5" /><path d="M12 9v12M3 13h18M12 9C9 4 5 5 6.5 8 7.3 9.3 12 9 12 9Zm0 0c3-5 7-4 5.5-1-.8 1.3-5.5 1-5.5 1Z" />
        </svg>
      );
    case "heart":
      return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth="1.8"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>;
    case "moon":
      return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill={color}><path d="M15 3a9 9 0 1 0 6 13A7 7 0 0 1 15 3Z" /></svg>;
    case "andean":
      return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill={color}><path d="M2 20v-4h4v-4h4V8h4v4h4v4h4v4Z" /></svg>;
    case "petal":
      return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth="1.8"><circle cx="12" cy="9" r="3" /><path d="M12 12v9M12 17c-3 0-5-2-5-4 3 0 5 2 5 4Z" /></svg>;
    case "sun":
      return <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
    case "leaf":
      return <Leaf color={color} className={className} />;
    case "none":
      return null;
    default:
      return <Sparkle color={color} className={className} />;
  }
}
