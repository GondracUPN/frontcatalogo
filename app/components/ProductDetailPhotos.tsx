"use client";

import Image from "next/image";
import React from "react";
import { createPortal } from "react-dom";
import { detailCountLabel } from "@/lib/catalog-display";

type Props = { images: string[]; description?: string };
type Point = { x: number; y: number };

export default function ProductDetailPhotos({ images, description = "" }: Props) {
  const safeImages = React.useMemo(() => Array.from(new Set((images || []).filter(Boolean))), [images]);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const [mounted, setMounted] = React.useState(false);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dragRef = React.useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });

  React.useEffect(() => setMounted(true), []);
  React.useEffect(() => {
    if (!open) return;
    const returnFocusTo = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") setActive((value) => (value + 1) % safeImages.length);
      if (event.key === "ArrowLeft") setActive((value) => (value - 1 + safeImages.length) % safeImages.length);
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
      returnFocusTo?.focus();
    };
  }, [open, safeImages.length]);

  React.useEffect(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, [active, open]);
  if (!description && !safeImages.length) return null;

  const openViewer = () => { setActive(0); setOpen(true); };
  const goTo = (index: number) => setActive((index + safeImages.length) % safeImages.length);
  const current = safeImages[active] || "";
  const label = detailCountLabel(safeImages.length, Boolean(description));
  const neutralDescription = description
    ? `${description.charAt(0).toLocaleUpperCase("es")}${description.slice(1)}${/[.!?]$/.test(description) ? "" : "."}`
    : "Revisa las fotografías del estado real de este equipo.";
  const indicator = safeImages.length ? `Este equipo tiene ${label}` : label;

  const modal = open && current ? (
    <div className="fixed inset-0 z-[90] bg-[rgba(15,23,42,0.86)] p-3 sm:p-5" onMouseUp={() => { dragRef.current.active = false; }}>
      <button className="absolute inset-0" aria-label="Cerrar detalle ampliado" onClick={() => setOpen(false)} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Fotografías del estado estético del equipo" className="relative z-[1] flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 pb-3 text-white">
          <div className="rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm font-medium">Detalle estético {active + 1} de {safeImages.length}</div>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-neutral-950">Cerrar</button>
        </div>
        <div
          className={`relative min-h-0 flex-1 overflow-hidden rounded-[24px] bg-white ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
          onWheel={(event) => { event.preventDefault(); setZoom((value) => Math.max(1, Math.min(5, value + (event.deltaY < 0 ? 0.25 : -0.25)))); }}
          onDoubleClick={() => setZoom((value) => value > 1 ? 1 : 2.5)}
          onMouseDown={(event) => { if (zoom > 1) dragRef.current = { active: true, x: event.clientX, y: event.clientY }; }}
          onMouseMove={(event) => { if (!dragRef.current.active || zoom <= 1) return; const dx = event.clientX - dragRef.current.x; const dy = event.clientY - dragRef.current.y; dragRef.current = { active: true, x: event.clientX, y: event.clientY }; setPan((value) => ({ x: value.x + dx, y: value.y + dy })); }}
        >
          <div className="absolute inset-0 transition-transform duration-150" style={{ transform: `translate3d(${pan.x}px,${pan.y}px,0) scale(${zoom})` }}>
            <Image src={current} alt={`Detalle estético ${active + 1} del equipo`} fill sizes="100vw" className="object-contain p-3 sm:p-6" draggable={false} />
          </div>
          {safeImages.length > 1 && zoom === 1 && <>
            <button type="button" onClick={() => goTo(active - 1)} className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl shadow-lg" aria-label="Detalle anterior">‹</button>
            <button type="button" onClick={() => goTo(active + 1)} className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-2xl shadow-lg" aria-label="Detalle siguiente">›</button>
          </>}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">{Math.round(zoom * 100)}% · doble clic o rueda para ampliar</div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section aria-labelledby="condition-details-title" className="rounded-[24px] border border-amber-200 bg-[linear-gradient(145deg,#fffbeb,#fff7ed)] p-4 shadow-[0_12px_30px_rgba(180,83,9,0.08)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Estado verificado</div>
          <h2 id="condition-details-title" className="mt-1 text-lg font-semibold text-amber-950">Estado estético</h2>
        </div>
        <span className="max-w-[58%] rounded-full border border-amber-300 bg-white/80 px-3 py-1 text-center text-xs font-semibold text-amber-900">{indicator}</span>
      </div>
      <div className={`mt-4 ${safeImages.length ? "grid grid-cols-[88px_1fr] gap-4" : ""}`}>
        {safeImages.length > 0 && (
          <button ref={triggerRef} type="button" onClick={openViewer} className="group relative h-[88px] w-[88px] overflow-hidden rounded-[16px] border-2 border-amber-300 bg-white text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300" aria-label="Ver detalle estético ampliado">
            <Image src={safeImages[0]} alt="Miniatura del detalle estético del equipo" fill sizes="88px" className="object-cover" />
            <span className="absolute inset-x-1 bottom-1 rounded bg-amber-950/85 px-1 py-0.5 text-center text-[9px] font-bold uppercase tracking-wide text-white">Detalle estético</span>
          </button>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium leading-6 text-amber-950/90">{neutralDescription}</p>
          {safeImages.length > 0 && <button type="button" onClick={openViewer} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950 hover:bg-amber-50">Ver detalle ampliado</button>}
        </div>
      </div>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </section>
  );
}
