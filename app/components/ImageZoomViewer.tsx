"use client";

import React from "react";
import { createPortal } from "react-dom";

// Visor de fotos a pantalla completa con gestos como la app Fotos:
// - Pellizcar para acercar/alejar en el punto entre los dedos.
// - Doble toque para acercar en ese punto (y otro doble toque para volver).
// - Arrastrar la foto ampliada, con límites y rebote suave en los bordes.
// - Deslizar a los lados para cambiar de foto (sigue al dedo).
// - Deslizar hacia abajo para cerrar.
// Los movimientos se aplican directamente al estilo (transform) sin volver a
// renderizar React en cada cuadro: así no hay tirones en iPhone.
//
// Se monta en <body> con un portal: así ningún contenedor de la página (una
// columna sticky, una animación con transform, overflow) puede atraparlo
// debajo de la cabecera o de otras capas. Mientras está abierto, el resto de
// la página queda inerte (sin foco ni lectores de pantalla).

/**
 * Versión para ampliar: en Cloudinary se pide la foto limitada a 2400 px, en
 * el formato y la calidad que mejor acepte el navegador (nunca una miniatura
 * estirada). Las fotos locales se usan tal cual.
 */
/** La variante de 640 px que pide la galería (normalmente ya está en caché). */
export function previewSource(url: string) {
  if (!url || url.startsWith("data:") || url.endsWith(".svg")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`;
}

export function zoomSource(url: string) {
  const match = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/);
  if (!match) return url;
  const [, prefix, rest] = match;
  // Si ya trae transformaciones (segmento con «_» antes de la versión), se respeta.
  if (/^[a-z]{1,3}_[^/]*\//.test(rest)) return url;
  return `${prefix}c_limit,w_2400,f_auto,q_auto/${rest}`;
}

type Props = {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  labelFor?: (index: number) => string;
  /**
   * Índice donde empiezan las fotos de detalles estéticos. Si se indica, el
   * visor muestra al lado (abajo en móvil) una tira con esos detalles para
   * saltar a ellos con un clic o un toque, sin recorrer todas las fotos.
   */
  detailStart?: number;
};

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const EASE = "cubic-bezier(.2,.8,.2,1)";

type Pt = { x: number; y: number };

/** Miniatura pequeña para la tira de detalles. */
function thumbSource(url: string) {
  if (!url || url.startsWith("data:") || url.endsWith(".svg")) return url;
  return `/_next/image?url=${encodeURIComponent(url)}&w=128&q=75`;
}

export default function ImageZoomViewer({ images, index, onIndexChange, onClose, labelFor, detailStart }: Props) {
  const count = images.length;
  const wrap = React.useCallback((i: number) => ((i % count) + count) % count, [count]);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const zoomRef = React.useRef<HTMLDivElement>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const [hintVisible, setHintVisible] = React.useState(true);
  const [zoomed, setZoomed] = React.useState(false);
  const [failed, setFailed] = React.useState<Set<number>>(() => new Set());
  const [loaded, setLoaded] = React.useState<Set<number>>(() => new Set());
  const [coarse, setCoarse] = React.useState(false);

  // Estado de la transformación (fuera de React para no re-renderizar).
  const t = React.useRef({ scale: 1, x: 0, y: 0, slide: 0, drop: 0 });
  const pointers = React.useRef(new Map<number, Pt>());
  const gesture = React.useRef<{
    kind: "none" | "pinch" | "pan" | "swipe" | "drop" | "pending";
    start: Pt;
    startT: { scale: number; x: number; y: number };
    startDist: number;
    startMid: Pt;
    startTime: number;
    last: Pt;
    lastTime: number;
    velocity: number;
  }>({ kind: "none", start: { x: 0, y: 0 }, startT: { scale: 1, x: 0, y: 0 }, startDist: 0, startMid: { x: 0, y: 0 }, startTime: 0, last: { x: 0, y: 0 }, lastTime: 0, velocity: 0 });
  const lastTap = React.useRef<{ time: number; x: number; y: number } | null>(null);
  const frame = React.useRef<number | null>(null);

  // Escribe la transformación en el DOM (sin pasar por React).
  const apply = React.useCallback((animate: boolean) => {
      const { scale, x, y, slide, drop } = t.current;
      const transition = animate ? `transform 280ms ${EASE}` : "none";
      if (zoomRef.current) {
        zoomRef.current.style.transition = transition;
        zoomRef.current.style.transform = `translate3d(${x}px, ${y + drop}px, 0) scale(${scale})`;
      }
      if (trackRef.current) {
        trackRef.current.style.transition = transition;
        trackRef.current.style.transform = `translate3d(${slide}px, 0, 0)`;
      }
      if (rootRef.current) {
        const fade = Math.max(0.35, 1 - Math.abs(drop) / 450);
        rootRef.current.style.transition = animate ? `background-color 280ms ${EASE}` : "none";
        rootRef.current.style.backgroundColor = `rgba(10,10,12,${fade})`;
      }
  }, []);

  // Durante los gestos: como máximo una escritura por cuadro.
  const render = React.useCallback((animate = false) => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      apply(animate);
    });
  }, [apply]);

  const stageRect = () => stageRef.current?.getBoundingClientRect() || new DOMRect(0, 0, window.innerWidth, window.innerHeight);

  // Límites de desplazamiento según el tamaño visible de la foto ampliada.
  const bounds = React.useCallback((scale: number) => {
    const rect = stageRect();
    const img = imgRef.current;
    const w = (img?.offsetWidth || rect.width) * scale;
    const h = (img?.offsetHeight || rect.height) * scale;
    return { x: Math.max(0, (w - rect.width) / 2), y: Math.max(0, (h - rect.height) / 2) };
  }, []);

  const rubber = (value: number, limit: number) => {
    if (value > limit) return limit + (value - limit) * 0.35;
    if (value < -limit) return -limit + (value + limit) * 0.35;
    return value;
  };

  const setZoomFlag = React.useCallback((scale: number) => {
    const next = scale > 1.02;
    setZoomed((current) => (current === next ? current : next));
  }, []);

  const settle = React.useCallback(() => {
    const s = Math.min(MAX_SCALE, Math.max(1, t.current.scale));
    const b = bounds(s);
    t.current.scale = s;
    t.current.x = s === 1 ? 0 : Math.max(-b.x, Math.min(b.x, t.current.x));
    t.current.y = s === 1 ? 0 : Math.max(-b.y, Math.min(b.y, t.current.y));
    t.current.drop = 0;
    setZoomFlag(s);
    render(true);
  }, [bounds, render, setZoomFlag]);

  const resetZoom = React.useCallback((animate: boolean) => {
    t.current = { scale: 1, x: 0, y: 0, slide: 0, drop: 0 };
    setZoomFlag(1);
    render(animate);
  }, [render, setZoomFlag]);

  // Acerca manteniendo fijo el punto de la pantalla indicado.
  const zoomAt = React.useCallback((nextScale: number, point: Pt, animate: boolean) => {
    const rect = stageRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const { scale, x, y } = t.current;
    const contentX = (point.x - center.x - x) / scale;
    const contentY = (point.y - center.y - y) / scale;
    t.current.scale = nextScale;
    t.current.x = point.x - center.x - contentX * nextScale;
    t.current.y = point.y - center.y - contentY * nextScale;
    if (animate) settle();
    else render(false);
  }, [render, settle]);

  const goTo = React.useCallback((direction: -1 | 1) => {
    if (count <= 1) {
      resetZoom(true);
      return;
    }
    const width = stageRect().width;
    t.current.scale = 1;
    t.current.x = 0;
    t.current.y = 0;
    t.current.slide = -direction * width;
    setZoomFlag(1);
    render(true);
    // Al terminar la animación cambia la foto; el carril se recoloca antes de
    // pintar (useLayoutEffect) para que no haya parpadeo.
    window.setTimeout(() => onIndexChange(wrap(index + direction)), 280);
  }, [count, index, onIndexChange, render, resetZoom, setZoomFlag, wrap]);

  /** Botones y teclado: acercar al centro o volver a la foto completa. */
  const toggleZoom = React.useCallback((zoomIn: boolean) => {
    const rect = stageRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    if (zoomIn && t.current.scale < MAX_SCALE) zoomAt(Math.min(MAX_SCALE, Math.max(DOUBLE_TAP_SCALE, t.current.scale * 1.6)), center, true);
    else if (!zoomIn) resetZoom(true);
  }, [resetZoom, zoomAt]);

  // El resto de la página queda inerte mientras el visor está abierto.
  React.useEffect(() => {
    const root = rootRef.current;
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    const others = Array.from(document.body.children).filter((node) => node !== root && node.tagName !== "SCRIPT" && !node.hasAttribute("inert"));
    others.forEach((node) => node.setAttribute("inert", ""));
    return () => others.forEach((node) => node.removeAttribute("inert"));
  }, []);

  // Teclado, foco y bloqueo del scroll de la página.
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(1);
      if (event.key === "ArrowLeft") goTo(-1);
      if (event.key === "+" || event.key === "=") toggleZoom(true);
      if (event.key === "-") toggleZoom(false);
    };
    window.addEventListener("keydown", onKey);
    const hint = window.setTimeout(() => setHintVisible(false), 2600);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(hint);
    };
  }, [goTo, onClose, toggleZoom]);

  // Nueva foto: sin zoom y con el carril centrado, antes de pintar.
  React.useLayoutEffect(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    t.current = { scale: 1, x: 0, y: 0, slide: 0, drop: 0 };
    setZoomFlag(1);
    apply(false);
  }, [index, apply, setZoomFlag]);

  // iOS: evita el zoom de toda la página con gestos sobre el visor.
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const prevent = (event: Event) => event.preventDefault();
    el.addEventListener("gesturestart", prevent);
    el.addEventListener("gesturechange", prevent);
    el.addEventListener("touchmove", prevent, { passive: false });
    return () => {
      el.removeEventListener("gesturestart", prevent);
      el.removeEventListener("gesturechange", prevent);
      el.removeEventListener("touchmove", prevent);
    };
  }, []);

  const midpoint = (): Pt => {
    const pts = Array.from(pointers.current.values());
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  };
  const distance = () => {
    const pts = Array.from(pointers.current.values());
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Algunos navegadores rechazan la captura; el gesto sigue funcionando.
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    const now = performance.now();
    if (pointers.current.size === 2) {
      g.kind = "pinch";
      g.startDist = distance() || 1;
      g.startMid = midpoint();
      g.startT = { scale: t.current.scale, x: t.current.x, y: t.current.y };
      lastTap.current = null;
      return;
    }
    if (pointers.current.size === 1) {
      g.kind = "pending";
      g.start = { x: event.clientX, y: event.clientY };
      g.last = g.start;
      g.startTime = now;
      g.lastTime = now;
      g.velocity = 0;
      g.startT = { scale: t.current.scale, x: t.current.x, y: t.current.y };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    const now = performance.now();

    if (g.kind === "pinch" && pointers.current.size >= 2) {
      const mid = midpoint();
      const raw = g.startT.scale * (distance() / g.startDist);
      // Se permite pasar un poco los límites; al soltar vuelve a su sitio.
      const nextScale = raw < 1 ? 1 - (1 - raw) * 0.4 : raw > MAX_SCALE ? MAX_SCALE + (raw - MAX_SCALE) * 0.25 : raw;
      const rect = stageRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const contentX = (g.startMid.x - center.x - g.startT.x) / g.startT.scale;
      const contentY = (g.startMid.y - center.y - g.startT.y) / g.startT.scale;
      t.current.scale = nextScale;
      t.current.x = mid.x - center.x - contentX * nextScale;
      t.current.y = mid.y - center.y - contentY * nextScale;
      render(false);
      return;
    }

    if (pointers.current.size !== 1) return;
    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    const dt = Math.max(1, now - g.lastTime);
    g.velocity = (event.clientX - g.last.x) / dt;
    g.last = { x: event.clientX, y: event.clientY };
    g.lastTime = now;

    if (g.kind === "pending") {
      if (Math.hypot(dx, dy) < 8) return;
      if (t.current.scale > 1.02) g.kind = "pan";
      else if (Math.abs(dx) > Math.abs(dy)) g.kind = "swipe";
      else g.kind = dy > 0 ? "drop" : "none";
    }

    if (g.kind === "pan") {
      const b = bounds(t.current.scale);
      t.current.x = rubber(g.startT.x + dx, b.x);
      t.current.y = rubber(g.startT.y + dy, b.y);
      render(false);
    } else if (g.kind === "swipe") {
      // Resistencia en los extremos cuando solo hay una foto.
      t.current.slide = count > 1 ? dx : dx * 0.3;
      render(false);
    } else if (g.kind === "drop") {
      t.current.drop = Math.max(0, dy);
      render(false);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    const wasPointers = pointers.current.size;
    pointers.current.delete(event.pointerId);

    if (g.kind === "pinch") {
      if (pointers.current.size === 1) {
        // Queda un dedo: continúa como arrastre desde aquí.
        const remaining = Array.from(pointers.current.values())[0];
        g.kind = "pan";
        g.start = remaining;
        g.startT = { scale: t.current.scale, x: t.current.x, y: t.current.y };
        return;
      }
      g.kind = "none";
      settle();
      return;
    }
    if (wasPointers !== 1) return;

    const dx = event.clientX - g.start.x;
    const dy = event.clientY - g.start.y;
    const width = stageRect().width;

    if (g.kind === "swipe") {
      const fast = Math.abs(g.velocity) > 0.45;
      if (count > 1 && (dx < -width * 0.18 || (fast && g.velocity < 0))) goTo(1);
      else if (count > 1 && (dx > width * 0.18 || (fast && g.velocity > 0))) goTo(-1);
      else {
        t.current.slide = 0;
        render(true);
      }
    } else if (g.kind === "drop") {
      if (dy > 110) onClose();
      else {
        t.current.drop = 0;
        render(true);
      }
    } else if (g.kind === "pan") {
      settle();
    } else if (g.kind === "pending") {
      // Toque: ¿es el segundo de un doble toque?
      const now = performance.now();
      const prev = lastTap.current;
      if (prev && now - prev.time < 320 && Math.hypot(event.clientX - prev.x, event.clientY - prev.y) < 40) {
        lastTap.current = null;
        if (t.current.scale > 1.02) resetZoom(true);
        else zoomAt(DOUBLE_TAP_SCALE, { x: event.clientX, y: event.clientY }, true);
      } else {
        lastTap.current = { time: now, x: event.clientX, y: event.clientY };
      }
    }
    g.kind = "none";
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    const factor = Math.exp(-event.deltaY * 0.0022);
    const next = Math.min(MAX_SCALE, Math.max(1, t.current.scale * factor));
    zoomAt(next, { x: event.clientX, y: event.clientY }, false);
    if (next === 1) resetZoom(false);
    setZoomFlag(next);
  };

  const slides = count > 1 ? [-1, 0, 1] : [0];
  const railRef = React.useRef<HTMLDivElement>(null);
  // La miniatura de la foto visible queda siempre a la vista en la tira.
  React.useEffect(() => {
    const thumb = railRef.current?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    thumb?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);
  const hasDetails = typeof detailStart === "number" && detailStart > 0 && detailStart < count;
  const inDetails = hasDetails && index >= (detailStart as number);
  // Salto directo desde la tira: sin animación de carril, la foto nueva entra centrada.
  const jumpTo = (target: number) => {
    if (target === index) return;
    t.current = { scale: 1, x: 0, y: 0, slide: 0, drop: 0 };
    setZoomFlag(1);
    onIndexChange(wrap(target));
  };

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Fotos del producto"
      className="fixed inset-0 z-[100] flex flex-col overscroll-contain"
      style={{ backgroundColor: "rgb(10,10,12)" }}
    >
      <div className="relative z-[3] flex items-center justify-between gap-3 px-3 pb-2 pt-[max(12px,env(safe-area-inset-top))] text-white sm:px-5">
        <span className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium" aria-live="polite">
          {index + 1} / {count}
        </span>
        <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => toggleZoom(!zoomed)}
          aria-label={zoomed ? "Ver la foto completa" : "Acercar la foto"}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-white hover:bg-white/20"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6" />{!zoomed && <path d="M11 8v6" />}</svg>
        </button>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-white/12 px-4 text-sm font-semibold text-white hover:bg-white/20"
        >
          Cerrar
        </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
      <div
        ref={stageRef}
        className={`relative min-h-0 min-w-0 flex-1 select-none overflow-hidden ${zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div ref={trackRef} className="absolute inset-0 will-change-transform">
          {slides.map((offset) => {
            const i = wrap(index + offset);
            const current = offset === 0;
            return (
              <div
                key={`${offset}-${i}`}
                className="absolute inset-0 flex items-center justify-center p-2 sm:p-8"
                style={{ transform: `translate3d(${offset * 100}%, 0, 0)` }}
                aria-hidden={!current}
              >
                {/* Indicador detrás de la foto: se ve mientras descarga y la foto lo tapa al pintarse. */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-white/20 border-t-white/70" />
                </span>
                <div ref={current ? zoomRef : undefined} className="relative grid h-full w-full grid-cols-[100%] grid-rows-[100%] place-items-center will-change-transform" style={{ transformOrigin: "50% 50%" }}>
                  {/* Vista previa inmediata: la misma foto en el tamaño que ya descargó la galería.
                      La versión grande se pinta encima, con el mismo encuadre, al terminar. */}
                  {!failed.has(i) && !loaded.has(i) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewSource(images[i])}
                      alt=""
                      aria-hidden="true"
                      draggable={false}
                      className="h-full w-full object-contain [grid-area:1/1]"
                    />
                  )}
                  {failed.has(i) ? (
                    <span className="relative rounded-2xl bg-white/10 px-5 py-4 text-center text-sm text-white/85">No se pudo cargar esta foto.</span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      ref={current ? imgRef : undefined}
                      src={zoomSource(images[i])}
                      alt={labelFor ? labelFor(i) : `Foto ${i + 1} del producto`}
                      draggable={false}
                      decoding="async"
                      onError={() => setFailed((value) => (value.has(i) ? value : new Set(value).add(i)))}
                      onLoad={() => setLoaded((value) => (value.has(i) ? value : new Set(value).add(i)))}
                      className="relative max-h-full max-w-full object-contain [grid-area:1/1]"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => goTo(-1)}
              className="absolute left-3 top-1/2 z-[2] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-3xl text-white hover:bg-white/20 sm:inline-flex"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => goTo(1)}
              className="absolute right-3 top-1/2 z-[2] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-3xl text-white hover:bg-white/20 sm:inline-flex"
              aria-label="Foto siguiente"
            >
              ›
            </button>
          </>
        )}

        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-[max(16px,env(safe-area-inset-bottom))] z-[2] flex justify-center transition-opacity duration-500 ${hintVisible ? "opacity-100" : "opacity-0"}`}
        >
          <span className="rounded-full bg-black/55 px-4 py-2 text-xs font-medium text-white">
            {coarse ? "Pellizca o toca dos veces para acercar" : "Doble clic, rueda o + para acercar · Esc para cerrar"}
          </span>
        </div>
      </div>
      {count > 1 && (
        <nav
          aria-label="Todas las fotos"
          className="relative z-[3] flex shrink-0 flex-col border-t border-white/10 bg-black/50 pb-[max(8px,env(safe-area-inset-bottom))] sm:w-[200px] sm:border-l sm:border-t-0 sm:pb-0"
        >
          {hasDetails && (
            <div role="group" aria-label="Ir a" className="grid grid-cols-2 gap-1.5 px-3 pt-2.5 sm:px-3 sm:pt-4">
              <button
                type="button"
                onClick={() => jumpTo(0)}
                aria-pressed={!inDetails}
                className={`min-h-10 rounded-full px-2 text-[13px] font-semibold transition-colors ${!inDetails ? "bg-white text-[color:var(--foreground)]" : "bg-white/10 text-white hover:bg-white/20"}`}
              >
                Equipo · {detailStart}
              </button>
              <button
                type="button"
                onClick={() => jumpTo(detailStart as number)}
                aria-pressed={inDetails}
                className={`min-h-10 rounded-full px-2 text-[13px] font-semibold transition-colors ${inDetails ? "bg-amber-300 text-amber-950" : "bg-amber-300/15 text-amber-200 hover:bg-amber-300/25"}`}
              >
                Detalles · {count - (detailStart as number)}
              </button>
            </div>
          )}
          <div ref={railRef} className="no-scrollbar flex min-h-0 gap-2 overflow-x-auto px-3 pb-1 pt-2.5 sm:block sm:flex-1 sm:overflow-y-auto sm:overflow-x-hidden sm:pb-4">
            {(hasDetails ? [[0, detailStart as number, "Fotos del equipo"], [detailStart as number, count, "Detalles estéticos"]] as const : [[0, count, ""]] as const).map(([from, to, label]) => (
              <div key={from} className="flex shrink-0 items-start gap-2 sm:mt-3 sm:block sm:first:mt-0">
                {label && (
                  <p className={`hidden text-[11px] font-semibold uppercase tracking-wide sm:mb-1.5 sm:block ${from > 0 ? "text-amber-200" : "text-white/60"}`}>{label}</p>
                )}
                <ul className="flex gap-2 sm:grid sm:grid-cols-2">
                  {images.slice(from, to).map((src, offset) => {
                    const i = from + offset;
                    const active = i === index;
                    const detail = hasDetails && from > 0;
                    return (
                      <li key={`${src}-${i}`} className="shrink-0">
                        <button
                          type="button"
                          data-index={i}
                          onClick={() => jumpTo(i)}
                          aria-current={active ? "true" : undefined}
                          aria-label={detail ? `Ver detalle ${offset + 1}` : `Ver foto ${offset + 1} del equipo`}
                          className={`relative block h-14 w-14 overflow-hidden rounded-xl border-2 sm:aspect-square sm:h-auto sm:w-full ${active ? (detail ? "border-amber-300" : "border-white") : "border-transparent opacity-75 hover:opacity-100"}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={thumbSource(src)} alt="" className="h-full w-full object-cover" draggable={false} loading="lazy" />
                          {detail && <span className="absolute left-1 top-1 rounded-full bg-amber-300 px-1.5 text-[9px] font-bold text-amber-950">{offset + 1}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {/* Separador de grupos en la tira horizontal del celular. */}
                {label && from === 0 && <span aria-hidden="true" className="mx-0.5 h-14 w-px shrink-0 bg-amber-300/60 sm:hidden" />}
              </div>
            ))}
          </div>
        </nav>
      )}
      </div>
    </div>,
    document.body,
  );
}
