"use client";

import React from "react";
import { Bat, Flower, Heart, PeruFlag, Pumpkin, Snowflake, Star } from "./decor";

// Partículas decorativas: SVG (nítidas, sin emojis del sistema), animadas solo
// con transform (las mueve la GPU), sin capturar clics, en pausa cuando la
// pestaña no está visible y desactivadas con «reducir movimiento».
const CONFETTI = ["#f59e0b", "#ef4444", "#3b82f6", "#10b981", "#a855f7", "#ec4899"];

function Particle({ effect, index, size }: { effect: string; index: number; size: number }) {
  const style = { width: size, height: size };
  switch (effect) {
    case "snow":
      return <Snowflake style={{ ...style, color: index % 3 ? "#bfdbfe" : "#93c5fd" }} />;
    case "hearts":
      return <Heart style={{ ...style, color: ["#f43f5e", "#fb7185", "#e11d48"][index % 3] }} />;
    case "pumpkins":
      return index % 3 === 0 ? <Pumpkin style={style} /> : <Bat style={{ width: size * 1.6, height: size * 0.8, color: "#1c1917" }} />;
    case "stars":
      return <Star style={{ ...style, color: ["#fbbf24", "#93c5fd", "#fde68a"][index % 3] }} />;
    case "flowers":
      return <Flower style={{ ...style, color: ["#f472b6", "#f9a8d4", "#fb7185"][index % 3] }} />;
    case "flags":
      return index % 4 === 0
        ? <PeruFlag style={{ width: size * 1.4, height: size * 0.95 }} />
        : <span className="block rounded-[2px]" style={{ width: size * 0.55, height: size * 0.8, background: index % 2 ? "#d91023" : "#ffffff", boxShadow: "0 0 0 1px rgba(0,0,0,.08)" }} />;
    case "confetti":
      return <span className="block rounded-[2px]" style={{ width: size * 0.45, height: size * 0.75, background: CONFETTI[index % CONFETTI.length] }} />;
    case "sun":
      return <span className="block rounded-full" style={{ width: size * 0.6, height: size * 0.6, background: "radial-gradient(circle at 30% 30%, #fff, rgba(125,211,252,.5))", border: "1px solid rgba(14,165,233,.35)" }} />;
    default:
      return null;
  }
}

export default function ThemeEffects({ effect }: { effect: string }) {
  const [state, setState] = React.useState<{ enabled: boolean; count: number; scale: number }>({ enabled: false, count: 0, scale: 1 });
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      const width = window.innerWidth;
      // Más partículas y más grandes en pantallas amplias; pocas en móviles.
      const count = width >= 1280 ? 14 : width >= 768 ? 10 : 6;
      const scale = width >= 1280 ? 1.1 : 1;
      setState({ enabled: !media.matches, count, scale });
    };
    const onVisibility = () => setPaused(document.hidden);
    update();
    media.addEventListener("change", update);
    window.addEventListener("resize", update, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const particles = React.useMemo(
    () => Array.from({ length: state.count }, (_, i) => ({
      left: ((i * 61) % 100) + ((i * 7) % 3),
      delay: -((i * 37) % 140) / 10,
      duration: 11 + ((i * 53) % 90) / 10,
      size: Math.round((12 + ((i * 29) % 12)) * state.scale),
      drift: ((i % 2) * 2 - 1) * (18 + (i % 5) * 9),
      spin: i % 2 ? 1 : -1,
      opacity: 0.45 + ((i * 13) % 30) / 100,
    })),
    [state.count, state.scale],
  );

  if (!state.enabled || !state.count) return null;
  const rising = effect === "sun"; // burbujas de verano: suben

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" style={{ contain: "strict" }}>
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: rising ? "auto" : 0,
            bottom: rising ? 0 : "auto",
            opacity: p.opacity,
            willChange: "transform",
            animation: `${rising ? "ms-rise" : "ms-fall"} ${p.duration}s linear ${p.delay}s infinite`,
            animationPlayState: paused ? "paused" : "running",
            ["--ms-drift" as string]: `${p.drift}px`,
            ["--ms-spin" as string]: `${p.spin * 360}deg`,
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,.12))",
          }}
        >
          <Particle effect={effect} index={i} size={p.size} />
        </span>
      ))}
    </div>
  );
}
