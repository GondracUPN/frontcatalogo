"use client";

import Image from "next/image";
import React from "react";

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function ProductDetailPhotos({ images }: { images: string[] }) {
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const pinchRef = React.useRef<{ distance: number; zoom: number } | null>(null);
  const lastTapRef = React.useRef(0);

  React.useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [active, open]);

  const current = safeImages[Math.max(0, Math.min(active, safeImages.length - 1))] || "";

  const clampPan = React.useCallback((nextPan: Point, nextZoom = zoom) => {
    const stage = stageRef.current;
    if (!stage || nextZoom <= 1) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    const maxX = (rect.width * (nextZoom - 1)) / 2;
    const maxY = (rect.height * (nextZoom - 1)) / 2;
    return {
      x: clamp(nextPan.x, -maxX, maxX),
      y: clamp(nextPan.y, -maxY, maxY),
    };
  }, [zoom]);

  const setClampedZoom = React.useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
    const clampedZoom = clamp(+nextZoom.toFixed(2), 1, 5);
    if (clampedZoom === 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const stage = stageRef.current;
    if (!stage || clientX === undefined || clientY === undefined || zoom === 1) {
      setZoom(clampedZoom);
      setPan((currentPan) => clampPan(currentPan, clampedZoom));
      return;
    }

    const rect = stage.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const ratio = clampedZoom / zoom;
    const relative = { x: clientX - center.x, y: clientY - center.y };
    const nextPan = {
      x: relative.x - ratio * (relative.x - pan.x),
      y: relative.y - ratio * (relative.y - pan.y),
    };
    setZoom(clampedZoom);
    setPan(clampPan(nextPan, clampedZoom));
  }, [clampPan, pan.x, pan.y, zoom]);

  const resetZoom = React.useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const goTo = (index: number) => {
    if (!safeImages.length) return;
    setActive((index + safeImages.length) % safeImages.length);
    resetZoom();
  };

  const touchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setClampedZoom(zoom + (event.deltaY < 0 ? 0.25 : -0.25), event.clientX, event.clientY);
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      resetZoom();
      return;
    }
    setClampedZoom(2.6, event.clientX, event.clientY);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    event.preventDefault();
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || zoom <= 1) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    setPan((currentPan) => clampPan({ x: currentPan.x + dx, y: currentPan.y + dy }));
  };

  const endMouseDrag = () => {
    dragRef.current.active = false;
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      event.preventDefault();
      pinchRef.current = { distance: touchDistance(event.touches), zoom };
      dragRef.current.active = false;
      return;
    }

    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    const now = Date.now();
    if (now - lastTapRef.current < 280) {
      event.preventDefault();
      lastTapRef.current = 0;
      if (zoom > 1) resetZoom();
      else setClampedZoom(2.6, touch.clientX, touch.clientY);
      return;
    }
    lastTapRef.current = now;

    if (zoom > 1) {
      dragRef.current = { active: true, x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchRef.current) {
      event.preventDefault();
      const distance = touchDistance(event.touches);
      if (!distance) return;
      setClampedZoom(pinchRef.current.zoom * (distance / pinchRef.current.distance));
      return;
    }

    if (event.touches.length === 1 && dragRef.current.active && zoom > 1) {
      event.preventDefault();
      const touch = event.touches[0];
      const dx = touch.clientX - dragRef.current.x;
      const dy = touch.clientY - dragRef.current.y;
      dragRef.current = { active: true, x: touch.clientX, y: touch.clientY };
      setPan((currentPan) => clampPan({ x: currentPan.x + dx, y: currentPan.y + dy }));
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.active = false;
    pinchRef.current = null;
  };

  if (!safeImages.length) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setActive(0);
          setOpen(true);
        }}
        className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-black/10 bg-[color:var(--foreground)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.16)] hover:bg-black sm:w-auto"
      >
        Ver fotos de detalles
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] bg-white/45 p-3 backdrop-blur-md sm:p-5">
          <button className="absolute inset-0" aria-label="Cerrar fotos de detalles" onClick={() => setOpen(false)} />
          <div className="relative z-[1] flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 pb-3 text-neutral-700">
              <div className="rounded-full border border-black/8 bg-white/78 px-3 py-2 text-sm font-medium shadow-[0_10px_26px_rgba(0,0,0,0.08)] backdrop-blur-xl">
                Detalle {active + 1} de {safeImages.length}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-black/8 bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl hover:bg-black"
              >
                Cerrar
              </button>
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-black/6 bg-transparent">
              <div
                ref={stageRef}
                className={`relative h-full w-full select-none overflow-hidden touch-none ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={endMouseDrag}
                onMouseLeave={endMouseDrag}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                <div
                  className="absolute inset-0 transition-transform duration-150"
                  style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                    transformOrigin: "center center",
                  }}
                >
                  <Image src={current} alt="" fill sizes="100vw" className="object-contain p-3 sm:p-6" draggable={false} />
                </div>
              </div>

              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-black/8 bg-white/82 px-3 py-1 text-[11px] font-medium text-neutral-700 shadow-[0_12px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
                {zoom > 1 ? `${Math.round(zoom * 100)}%` : "Doble click o pellizca para acercar"}
              </div>

              {safeImages.length > 1 && zoom === 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goTo(active - 1)}
                    className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white/86 text-3xl font-light leading-none text-neutral-950 shadow-[0_16px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl hover:bg-white"
                    aria-label="Detalle anterior"
                  >
                    {"<"}
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(active + 1)}
                    className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white/86 text-3xl font-light leading-none text-neutral-950 shadow-[0_16px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl hover:bg-white"
                    aria-label="Detalle siguiente"
                  >
                    {">"}
                  </button>
                </>
              )}
            </div>

            {safeImages.length > 1 && (
              <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
                {safeImages.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => goTo(index)}
                    className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] border ${
                      index === active ? "border-neutral-950 bg-white" : "border-black/8 bg-white/70"
                    }`}
                    aria-label={`Ver detalle ${index + 1}`}
                  >
                    <Image src={src} alt="" fill sizes="64px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
