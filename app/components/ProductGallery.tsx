"use client";
import React from "react";

type Point = { x: number; y: number };

export default function ProductGallery({ images, sold }: { images: string[]; sold?: boolean }) {
  const imgs = Array.isArray(images) && images.length ? images : ["/placeholder.svg"];
  const [active, setActive] = React.useState(0);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const safeIndex = (i: number) => Math.max(0, Math.min(i, imgs.length - 1));
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const pinchRef = React.useRef<{ distance: number; zoom: number } | null>(null);

  React.useEffect(() => {
    setActive(0);
  }, [images?.join("|")]);

  React.useEffect(() => {
    if (!viewerOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [viewerOpen]);

  React.useEffect(() => {
    if (!viewerOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [viewerOpen, active]);

  React.useEffect(() => {
    if (!viewerOpen) return;
    const endDrag = () => {
      dragRef.current.active = false;
    };
    window.addEventListener("mouseup", endDrag);
    return () => window.removeEventListener("mouseup", endDrag);
  }, [viewerOpen]);

  const openViewer = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const stepZoom = (delta: number) => {
    setZoom((current) => {
      const next = Math.max(1, Math.min(5, +(current + delta).toFixed(2)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const zoomAtPoint = React.useCallback((nextZoom: number, clientX?: number, clientY?: number) => {
    const clamped = Math.max(1, Math.min(5, +nextZoom.toFixed(2)));
    if (clamped === 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }

    const stage = stageRef.current;
    if (!stage || clientX === undefined || clientY === undefined || zoom === 1) {
      setZoom(clamped);
      return;
    }

    const rect = stage.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const ratio = clamped / zoom;
    const relative = { x: clientX - center.x, y: clientY - center.y };

    setPan((current) => ({
      x: +(relative.x - ratio * (relative.x - current.x)).toFixed(2),
      y: +(relative.y - ratio * (relative.y - current.y)).toFixed(2),
    }));
    setZoom(clamped);
  }, [zoom]);

  const normalizeZoom = React.useCallback((nextZoom: number) => {
    const clamped = Math.max(1, Math.min(5, +nextZoom.toFixed(2)));
    setZoom(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  }, []);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  const nextImage = () => {
    setActive((current) => safeIndex(current + 1));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const prevImage = () => {
    setActive((current) => safeIndex(current - 1));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 0.25 : -0.25;
    zoomAtPoint(zoom + delta, event.clientX, event.clientY);
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    event.preventDefault();
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current.active || zoom <= 1) return;
    const deltaX = event.clientX - dragRef.current.x;
    const deltaY = event.clientY - dragRef.current.y;
    dragRef.current = { active: true, x: event.clientX, y: event.clientY };
    setPan((current) => ({ x: current.x + deltaX, y: current.y + deltaY }));
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom > 1) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    zoomAtPoint(2.5, event.clientX, event.clientY);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      pinchRef.current = { distance: getTouchDistance(event.touches), zoom };
      return;
    }
    if (event.touches.length === 1 && zoom > 1) {
      dragRef.current = {
        active: true,
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2 && pinchRef.current) {
      event.preventDefault();
      const distance = getTouchDistance(event.touches);
      if (!distance) return;
      const nextZoom = pinchRef.current.zoom * (distance / pinchRef.current.distance);
      normalizeZoom(nextZoom);
      return;
    }

    if (event.touches.length === 1 && dragRef.current.active && zoom > 1) {
      event.preventDefault();
      const touch = event.touches[0];
      const deltaX = touch.clientX - dragRef.current.x;
      const deltaY = touch.clientY - dragRef.current.y;
      dragRef.current = { active: true, x: touch.clientX, y: touch.clientY };
      setPan((current) => ({ x: current.x + deltaX, y: current.y + deltaY }));
    }
  };

  const handleTouchEnd = () => {
    dragRef.current.active = false;
    pinchRef.current = null;
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={openViewer}
        className="surface-card-strong soft-outline relative mx-auto flex aspect-[4/3] min-h-[260px] w-full max-w-[760px] items-center justify-center overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#f7f9fb,#e8eef5)] p-3 text-left sm:aspect-[5/4] sm:min-h-[320px] sm:rounded-[30px] sm:p-4 lg:aspect-[4/3] lg:min-h-0 lg:rounded-[34px]"
        aria-label="Abrir imagen en grande"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.84),transparent_42%)]" />
        <img src={imgs[safeIndex(active)]} alt="" className="relative z-[1] h-full max-h-full w-full object-contain" />
        <div className="absolute bottom-3 right-3 rounded-full bg-white/78 px-3 py-1 text-[11px] font-semibold text-[color:var(--foreground-soft)] backdrop-blur-xl sm:bottom-4 sm:right-4 sm:text-xs">
          {active + 1} / {imgs.length}
        </div>
        {sold && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="absolute h-16 w-[140%] rotate-[-16deg] bg-black/72 md:h-20" />
            <span className="rotate-[-16deg] text-5xl font-extrabold tracking-[0.34em] text-white drop-shadow-lg md:text-7xl">VENDIDO</span>
          </div>
        )}
      </button>
      <div className="mx-auto flex w-full max-w-[760px] gap-2 overflow-x-auto pb-1 sm:gap-3">
        {imgs.map((u, i) => (
          <button
            key={i}
            aria-label={`Foto ${i + 1}`}
            onClick={() => setActive(i)}
            className={`overflow-hidden rounded-[20px] border p-1 ${
              i === active
                ? "border-[rgba(26,115,232,0.45)] bg-[rgba(26,115,232,0.08)] shadow-[0_16px_30px_rgba(26,115,232,0.12)]"
                : "border-black/8 bg-white/82 hover:border-black/15"
            }`}
          >
            <div className="h-[3.75rem] w-[3.75rem] overflow-hidden rounded-[14px] bg-[linear-gradient(145deg,#f6f8fb,#e8edf4)] sm:h-[4.5rem] sm:w-[4.5rem] md:h-[5.5rem] md:w-[5.5rem]">
              <img src={u} alt="" className="h-full w-full object-cover" />
            </div>
          </button>
        ))}
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-[80] bg-[rgba(8,12,20,0.94)] p-3 sm:p-5">
          <button className="absolute inset-0" aria-label="Cerrar imagen" onClick={closeViewer} />

          <div className="relative z-[1] flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 pb-3 text-white">
              <div className="text-sm font-medium">
                Imagen {active + 1} de {imgs.length}
              </div>
              <button
                type="button"
                onClick={closeViewer}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium"
              >
                Cerrar
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(17,24,39,0.55)]">
              {active > 0 && (
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white"
                  aria-label="Imagen anterior"
                >
                  Anterior
                </button>
              )}
              {active < imgs.length - 1 && (
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium text-white"
                  aria-label="Imagen siguiente"
                >
                  Siguiente
                </button>
              )}

              <div
                ref={stageRef}
                className={`flex h-full items-center justify-center overflow-hidden p-4 select-none sm:p-8 ${zoom > 1 ? "cursor-grab active:cursor-grabbing touch-none" : "cursor-zoom-in"}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={() => {
                  dragRef.current.active = false;
                }}
                onMouseLeave={() => {
                  dragRef.current.active = false;
                }}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              >
                <img
                  src={imgs[safeIndex(active)]}
                  alt=""
                  className="max-h-full w-auto max-w-full object-contain transition-transform duration-150"
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center center" }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
