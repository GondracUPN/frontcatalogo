// Logo de Macsomenos en SVG (fondo transparente), calcado del logo original.
// Admite adornos de temporada dibujados en el mismo sistema de coordenadas,
// así se ven igual en el logo pequeño de la cabecera y en el grande de la portada.
import React from "react";
import CuteSpider from "./theme/CuteSpider";

const INK = "#1d1d1f";

export function BrandMark({ preset }: { preset?: string | null }) {
  const leafFill = preset === "san_valentin" ? "#e11d48" : preset === "fiestas_patrias" ? "url(#ms-peru-leaf)" : INK;
  return (
    <>
      <defs>
        <linearGradient id="ms-peru-leaf" gradientUnits="userSpaceOnUse" x1="548" y1="246" x2="638" y2="326">
          <stop offset="0" stopColor="#d91023" />
          <stop offset=".34" stopColor="#d91023" />
          <stop offset=".34" stopColor="#ffffff" />
          <stop offset=".66" stopColor="#ffffff" />
          <stop offset=".66" stopColor="#d91023" />
          <stop offset="1" stopColor="#d91023" />
        </linearGradient>
      </defs>
      <path fill={INK} d="M215 778 L215 540 C215 450 288 378 377 378 C440 378 485 410 520 468 L604 606 C626 645 622 712 578 778 L432 522 C414 500 398 488 377 488 C346 488 323 512 323 545 L323 778 Z" />
      <path fill={INK} d="M527 442 C562 400 603 378 648 378 C736 378 808 450 808 540 L808 778 L698 778 L698 545 C698 512 676 488 648 488 C622 488 601 503 578 528 Z" />
      <path fill={leafFill} stroke={preset === "fiestas_patrias" ? "#b91c1c" : "none"} strokeWidth="5" d="M507 384 C500 295 560 205 680 188 C686 290 625 372 507 384 Z" />
    </>
  );
}

// ---------- Adornos ----------
function SantaHat() {
  return (
    <g transform="rotate(-18 377 380)">
      <path d="M262 392 C280 250 360 190 470 210 C430 240 420 300 470 330 C440 360 360 380 262 392 Z" fill="#dc2626" />
      <path d="M470 210 C500 230 515 270 505 300" stroke="#dc2626" strokeWidth="34" fill="none" strokeLinecap="round" />
      <circle cx="506" cy="310" r="30" fill="#ffffff" stroke="#e5e7eb" strokeWidth="4" />
      <rect x="240" y="372" width="250" height="52" rx="26" fill="#ffffff" stroke="#e5e7eb" strokeWidth="4" />
    </g>
  );
}

function PartyHat({ colors }: { colors: [string, string] }) {
  return (
    <g transform="rotate(-14 377 380)">
      <path d="M290 392 L377 160 L464 392 Z" fill={colors[0]} />
      <path d="M318 318 L436 318 M342 252 L412 252" stroke={colors[1]} strokeWidth="22" />
      <circle cx="377" cy="160" r="26" fill={colors[1]} />
      <rect x="280" y="380" width="194" height="26" rx="13" fill={colors[1]} />
    </g>
  );
}

function GradCap() {
  return (
    <g transform="rotate(-10 377 380)">
      <path d="M260 318 L377 268 L494 318 L377 368 Z" fill="#111827" />
      <path d="M312 342 L312 392 C350 412 404 412 442 392 L442 342 L377 370 Z" fill="#1f2937" />
      <path d="M494 318 L494 390" stroke="#facc15" strokeWidth="8" />
      <circle cx="494" cy="398" r="12" fill="#facc15" />
    </g>
  );
}

function Fedora() {
  return (
    <g transform="rotate(-12 377 380)">
      <ellipse cx="377" cy="392" rx="150" ry="28" fill="#1e3a8a" />
      <path d="M287 392 C290 300 320 260 377 262 C434 260 464 300 467 392 Z" fill="#1e40af" />
      <path d="M290 360 L464 360" stroke="#93c5fd" strokeWidth="18" />
    </g>
  );
}

// Arañita colgando de la punta de la hoja.
function Spider() {
  return <CuteSpider x={680} y={300} scale={1.05} thread={(300 - 190) / 1.05} />;
}

function Sunglasses() {
  return (
    <g>
      <path d="M300 498 L726 498" stroke={INK} strokeWidth="14" />
      <path d="M308 498 L446 498 C446 560 420 590 377 590 C334 590 308 560 308 498 Z" fill="#0f172a" />
      <path d="M580 498 L718 498 C718 560 692 590 649 590 C606 590 580 560 580 498 Z" fill="#0f172a" />
      <path d="M330 512 L370 512" stroke="#38bdf8" strokeWidth="10" strokeLinecap="round" opacity=".8" />
      <path d="M602 512 L642 512" stroke="#38bdf8" strokeWidth="10" strokeLinecap="round" opacity=".8" />
    </g>
  );
}

function Flower({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={x} cy={y - r * 0.55} rx={r * 0.42} ry={r * 0.6} fill={color} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r={r * 0.32} fill="#facc15" />
    </g>
  );
}

function Escarapela({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 22} ${y + 30} l-18 70 24-12 14 20 10-70z M${x + 22} ${y + 30} l18 70 -24-12 -14 20 -10-70z`} fill="#d91023" />
      {Array.from({ length: 16 }, (_, i) => (
        <ellipse key={i} cx={x} cy={y - 26} rx="12" ry="26" fill={i % 2 ? "#ffffff" : "#d91023"} stroke="#e5e7eb" strokeWidth="2" transform={`rotate(${i * 22.5} ${x} ${y})`} />
      ))}
      <circle cx={x} cy={y} r="22" fill="#d91023" />
      <circle cx={x} cy={y} r="12" fill="#ffffff" />
    </g>
  );
}

function PriceTag({ label, color, textColor }: { label: string; color: string; textColor: string }) {
  return (
    <g transform="rotate(-12 680 188)">
      <path d="M680 188 C720 196 748 210 770 232" stroke="#6b7280" strokeWidth="5" fill="none" />
      <path d="M728 236 L812 236 L812 350 L770 386 L728 350 Z" fill={color} stroke="#111827" strokeWidth="6" />
      <circle cx="770" cy="258" r="10" fill="#ffffff" stroke="#111827" strokeWidth="4" />
      <text x="770" y="334" textAnchor="middle" fontSize="58" fontWeight="900" fill={textColor} fontFamily="system-ui, sans-serif">{label}</text>
    </g>
  );
}

function Heart({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} fill={color} d="M0 18 C-22 4 -30 -10 -22 -20 C-14 -30 -2 -26 0 -16 C2 -26 14 -30 22 -20 C30 -10 22 4 0 18 Z" />;
}

function Decoration({ preset }: { preset: string }) {
  switch (preset) {
    case "navidad":
      return <SantaHat />;
    case "ano_nuevo":
      return <PartyHat colors={["#f59e0b", "#fde68a"]} />;
    case "aniversario":
      return <PartyHat colors={["#2563eb", "#facc15"]} />;
    case "halloween":
      return <Spider />;
    case "fiestas_patrias":
      return <Escarapela x={300} y={330} />;
    case "san_valentin":
      return (
        <>
          <Heart x={300} y={330} s={2.4} color="#f43f5e" />
          <Heart x={790} y={330} s={1.7} color="#fb7185" />
        </>
      );
    case "dia_madre":
      return (
        <>
          <Flower x={510} y={384} r={58} color="#f472b6" />
          <Flower x={300} y={360} r={40} color="#f9a8d4" />
        </>
      );
    case "dia_padre":
      return <Fedora />;
    case "verano":
      return <Sunglasses />;
    case "escolar":
      return <GradCap />;
    case "black_friday":
      return <PriceTag label="%" color="#facc15" textColor="#111827" />;
    case "cyber_days":
      return <PriceTag label="%" color="#7c3aed" textColor="#ffffff" />;
    default:
      return null;
  }
}

/** Logo con adorno opcional. `preset` es la celebración activa (o nada). */
export default function BrandLogo({ preset, className, title = "Macsomenos" }: { preset?: string | null; className?: string; title?: string }) {
  return (
    <svg viewBox="170 140 690 680" className={className} role="img" aria-label={title} overflow="visible">
      <BrandMark preset={preset} />
      {preset && <Decoration preset={preset} />}
    </svg>
  );
}
