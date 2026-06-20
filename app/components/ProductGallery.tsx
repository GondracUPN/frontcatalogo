"use client";
import Image from "next/image";
import React from "react";

type Point = { x: number; y: number };

export default function ProductGallery({ images, sold }: { images: string[]; sold?: boolean }) {
  const imgs = React.useMemo(
    () => (Array.isArray(images) && images.length ? images : ["/placeholder.svg"]),
    [images]
  );
  const [active, setActive] = React.useState(0);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState<Point>({ x: 0, y: 0 });
  const [mainDragOffset, setMainDragOffset] = React.useState(0);
  const [mainDragging, setMainDragging] = React.useState(false);
  const [mainTrackIndex, setMainTrackIndex] = React.useState(imgs.length > 1 ? 1 : 0);
  const [mainAnimating, setMainAnimating] = React.useState(false);
  const imageSignature = React.useMemo(() => images?.join("|") || "", [images]);
  const safeIndex = React.useCallback((i: number) => Math.max(0, Math.min(i, imgs.length - 1)), [imgs.length]);
  const wrapIndex = React.useCallback((i: number) => {
    if (!imgs.length) return 0;
    return ((i % imgs.length) + imgs.length) % imgs.length;
  }, [imgs.length]);
  const carouselImages = React.useMemo(
    () => (imgs.length > 1 ? [imgs[imgs.length - 1], ...imgs, imgs[0]] : imgs),
    [imgs]
  );
  const mainImageFitClass = "object-contain";
  const mainFrameAspect = "aspect-[4/3]";
  const stageRef = React.useRef<HTMLDivElement | null>(null);
  const thumbRailRef = React.useRef<HTMLDivElement | null>(null);
  const dragRef = React.useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const mainSwipeRef = React.useRef<{ active: boolean; dragging: boolean; x: number; y: number }>({ active: false, dragging: false, x: 0, y: 0 });
  const mainAnimationTimerRef = React.useRef<number | null>(null);
  const suppressOpenRef = React.useRef(false);
  const pinchRef = React.useRef<{ distance: number; zoom: number } | null>(null);
  const swipeRef = React.useRef<{ active: boolean; x: number; y: number } | null>(null);

  React.useEffect(() => {
    setActive(0);
    setViewerIndex(0);
    setMainTrackIndex(imgs.length > 1 ? 1 : 0);
    setMainAnimating(false);
    setMainDragging(false);
    setMainDragOffset(0);
  }, [imageSignature, imgs.length]);

  React.useEffect(() => {
    return () => {
      if (mainAnimationTimerRef.current !== null) window.clearTimeout(mainAnimationTimerRef.current);
    };
  }, []);

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
  }, [viewerOpen]);

  React.useEffect(() => {
    if (!viewerOpen) return;
    const endDrag = () => {
      dragRef.current.active = false;
    };
    window.addEventListener("mouseup", endDrag);
    return () => window.removeEventListener("mouseup", endDrag);
  }, [viewerOpen]);

  const openViewer = () => {
    if (suppressOpenRef.current) {
      suppressOpenRef.current = false;
      return;
    }
    setViewerIndex(active);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setViewerOpen(true);
  };

  const closeViewer = () => {
    setViewerOpen(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
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

  const goToImage = React.useCallback((index: number) => {
    const target = wrapIndex(index);
    setActive(target);
    setMainTrackIndex(imgs.length > 1 ? target + 1 : 0);
    setMainAnimating(imgs.length > 1);
    setMainDragging(false);
    setMainDragOffset(0);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [imgs.length, wrapIndex]);

  const slideMainImage = React.useCallback((direction: -1 | 1) => {
    if (imgs.length <= 1) return;
    if (mainAnimationTimerRef.current !== null) window.clearTimeout(mainAnimationTimerRef.current);
    setActive((current) => wrapIndex(current + direction));
    setMainAnimating(true);
    setMainDragging(false);
    setMainDragOffset(0);
    setMainTrackIndex((current) => current + direction);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    mainAnimationTimerRef.current = window.setTimeout(() => {
      setMainAnimating(false);
      setMainTrackIndex((current) => {
        if (current === 0) return imgs.length;
        if (current === imgs.length + 1) return 1;
        return current;
      });
      setMainDragOffset(0);
      suppressOpenRef.current = false;
      mainAnimationTimerRef.current = null;
    }, 460);
  }, [imgs.length, wrapIndex]);

  const nextImage = () => {
    slideMainImage(1);
  };

  const prevImage = () => {
    slideMainImage(-1);
  };

  const handleMainTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (mainAnimating || imgs.length <= 1 || event.touches.length !== 1) return;
    const touch = event.touches[0];
    mainSwipeRef.current = { active: true, dragging: false, x: touch.clientX, y: touch.clientY };
    setMainTrackIndex(active + 1);
    setMainAnimating(false);
    setMainDragging(false);
    setMainDragOffset(0);
  };

  const handleMainTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!mainSwipeRef.current.active || imgs.length <= 1 || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - mainSwipeRef.current.x;
    const dy = touch.clientY - mainSwipeRef.current.y;
    if (!mainSwipeRef.current.dragging) {
      if (Math.abs(dx) < 10) return;
      if (Math.abs(dx) <= Math.abs(dy) * 1.15) return;
      mainSwipeRef.current.dragging = true;
      suppressOpenRef.current = true;
      setMainDragging(true);
    }
    event.preventDefault();
    const width = event.currentTarget.getBoundingClientRect().width || 1;
    const offset = Math.max(-width, Math.min(width, dx));
    setMainDragOffset(offset);
  };

  const handleMainTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const swipe = mainSwipeRef.current;
    const wasDragging = swipe.active && swipe.dragging;
    if (swipe.active && swipe.dragging && imgs.length > 1) {
      const touch = event.changedTouches[0];
      const dx = touch ? touch.clientX - swipe.x : 0;
      const width = event.currentTarget.getBoundingClientRect().width || 1;
      const threshold = Math.max(54, width * 0.16);
      const shouldGoNext = dx < -threshold;
      const shouldGoPrev = dx > threshold;
      if (shouldGoNext || shouldGoPrev) {
        slideMainImage(shouldGoNext ? 1 : -1);
        mainSwipeRef.current = { active: false, dragging: false, x: 0, y: 0 };
        return;
      }
    }
    mainSwipeRef.current = { active: false, dragging: false, x: 0, y: 0 };
    setMainDragging(false);
    setMainAnimating(wasDragging);
    setMainDragOffset(0);
    window.setTimeout(() => {
      suppressOpenRef.current = false;
    }, 80);
  };

  const handleMainTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    if (mainAnimationTimerRef.current !== null) {
      window.clearTimeout(mainAnimationTimerRef.current);
      mainAnimationTimerRef.current = null;
    }
    if (imgs.length > 1 && mainTrackIndex === 0) {
      setMainAnimating(false);
      setMainTrackIndex(imgs.length);
    } else if (imgs.length > 1 && mainTrackIndex === imgs.length + 1) {
      setMainAnimating(false);
      setMainTrackIndex(1);
    } else {
      setMainAnimating(false);
    }
    setMainDragOffset(0);
    suppressOpenRef.current = false;
  };

  const goToViewerImage = React.useCallback((index: number) => {
    setViewerIndex(wrapIndex(index));
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [wrapIndex]);

  const nextViewerImage = React.useCallback(() => {
    goToViewerImage(viewerIndex + 1);
  }, [goToViewerImage, viewerIndex]);

  const prevViewerImage = React.useCallback(() => {
    goToViewerImage(viewerIndex - 1);
  }, [goToViewerImage, viewerIndex]);

  const scrollThumbs = (direction: -1 | 1) => {
    thumbRailRef.current?.scrollBy({ left: direction * 260, behavior: "smooth" });
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
      swipeRef.current = null;
      return;
    }
    if (event.touches.length === 1) {
      swipeRef.current = {
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

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (swipeRef.current?.active && zoom <= 1) {
      const start = swipeRef.current;
      const touch = event.changedTouches[0];
      if (touch) {
        const dx = touch.clientX - start.x;
        const dy = touch.clientY - start.y;
        if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
          if (dx < 0 && viewerIndex < imgs.length - 1) nextViewerImage();
          if (dx > 0 && viewerIndex > 0) prevViewerImage();
        }
      }
    }
    dragRef.current.active = false;
    pinchRef.current = null;
    swipeRef.current = null;
  };

  return (
    <div className="min-w-0 max-w-full overflow-hidden space-y-3">
      <div
        className={`surface-card-strong soft-outline relative mx-auto flex ${mainFrameAspect} max-h-[68svh] min-h-0 w-full max-w-full items-center justify-center overflow-hidden rounded-[18px] bg-[linear-gradient(145deg,#f8fafc,#edf2f7)] text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:min-h-[320px] sm:max-w-[760px] sm:rounded-[30px] lg:min-h-0 lg:rounded-[34px]`}
        onTouchStart={handleMainTouchStart}
        onTouchMove={handleMainTouchMove}
        onTouchEnd={handleMainTouchEnd}
        onTouchCancel={handleMainTouchEnd}
        style={{ touchAction: "pan-y" }}
      >
        <button
          type="button"
          onClick={openViewer}
          className="absolute inset-0 z-[2]"
          aria-label="Abrir imagen en grande"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.32),transparent_42%)]" />
        <div
          className={`relative z-[1] flex h-full w-full will-change-transform ${
            mainDragging ? "transition-none" : mainAnimating ? "transition-transform duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]" : "transition-none"
          }`}
          style={{
            transform: `translate3d(calc(${-mainTrackIndex * 100}% + ${mainDragOffset}px), 0, 0)`,
          }}
          onTransitionEnd={handleMainTransitionEnd}
        >
          {carouselImages.map((src, index) => {
            const shouldLoad = Math.abs(index - mainTrackIndex) <= 1 || carouselImages.length <= 3;
            return (
              <div key={`${src}-${index}`} className="relative h-full w-full shrink-0">
                {shouldLoad && (
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 54vw"
                    className={`h-full w-full ${mainImageFitClass}`}
                    {...(index === mainTrackIndex ? { priority: true } : { loading: "lazy" as const })}
                    draggable={false}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute bottom-3 right-3 z-[3] rounded-full bg-white/78 px-3 py-1 text-[11px] font-semibold text-[color:var(--foreground-soft)] backdrop-blur-xl sm:bottom-4 sm:right-4 sm:text-xs">
          {active + 1} / {imgs.length}
        </div>
        {imgs.length > 1 && (
          <button
            type="button"
            onClick={prevImage}
            className="absolute left-2 top-1/2 z-[3] inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/84 text-xl font-light leading-none text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl hover:-translate-x-0.5 hover:bg-white sm:left-4 sm:h-12 sm:w-12 sm:text-2xl"
            aria-label="Foto anterior"
          >
            {"‹"}
          </button>
        )}
        {imgs.length > 1 && (
          <button
            type="button"
            onClick={nextImage}
            className="absolute right-2 top-1/2 z-[3] inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-white/84 text-xl font-light leading-none text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl hover:translate-x-0.5 hover:bg-white sm:right-4 sm:h-12 sm:w-12 sm:text-2xl"
            aria-label="Foto siguiente"
          >
            {"›"}
          </button>
        )}
        {sold && (
          <div className="absolute inset-0 z-[4] pointer-events-none flex items-center justify-center">
            <div className="absolute h-16 w-[140%] rotate-[-16deg] bg-black/72 md:h-20" />
            <span className="rotate-[-16deg] text-5xl font-extrabold tracking-[0.34em] text-white drop-shadow-lg md:text-7xl">VENDIDO</span>
          </div>
        )}
      </div>
      <div className="mx-auto flex w-full max-w-full items-center gap-1.5 overflow-hidden sm:max-w-[760px] sm:gap-2">
        {imgs.length > 3 && (
          <button
            type="button"
            onClick={() => scrollThumbs(-1)}
            className="hidden h-10 w-10 shrink-0 rounded-full border border-black/8 bg-white/86 text-xl font-light leading-none text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.1)] backdrop-blur-xl hover:-translate-x-0.5 hover:bg-white sm:inline-flex sm:items-center sm:justify-center"
            aria-label="Desplazar fotos a la izquierda"
          >
            {"‹"}
          </button>
        )}
        <div
          ref={thumbRailRef}
          className="no-scrollbar flex min-w-0 max-w-full flex-1 snap-x gap-1.5 overflow-x-auto scroll-smooth px-0.5 py-1 sm:gap-3"
        >
          {imgs.map((u, i) => (
            <button
              key={i}
              aria-label={`Foto ${i + 1}`}
              onClick={() => goToImage(i)}
              className={`shrink-0 snap-start overflow-hidden rounded-[15px] border p-0.5 sm:rounded-[20px] sm:p-1 ${
                i === active
                  ? "border-[rgba(26,115,232,0.45)] bg-[rgba(26,115,232,0.08)] shadow-[0_16px_30px_rgba(26,115,232,0.12)]"
                  : "border-black/8 bg-white/82 hover:border-black/15"
              }`}
            >
              <div className="relative h-14 w-14 overflow-hidden rounded-[11px] bg-[linear-gradient(145deg,#f6f8fb,#e8edf4)] sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[14px] md:h-[5.5rem] md:w-[5.5rem]">
                <Image src={u} alt="" fill sizes="88px" className="h-full w-full object-cover" />
              </div>
            </button>
          ))}
        </div>
        {imgs.length > 3 && (
          <button
            type="button"
            onClick={() => scrollThumbs(1)}
            className="hidden h-10 w-10 shrink-0 rounded-full border border-black/8 bg-white/86 text-xl font-light leading-none text-[color:var(--foreground)] shadow-[0_10px_24px_rgba(15,23,42,0.1)] backdrop-blur-xl hover:translate-x-0.5 hover:bg-white sm:inline-flex sm:items-center sm:justify-center"
            aria-label="Desplazar fotos a la derecha"
          >
            {"›"}
          </button>
        )}
      </div>

      {viewerOpen && (
        <div className="fixed inset-0 z-[80] bg-white/45 p-3 backdrop-blur-md sm:p-5">
          <button className="absolute inset-0" aria-label="Cerrar imagen" onClick={closeViewer} />

          <div className="relative z-[1] flex h-full flex-col">
            <div className="flex items-center justify-between gap-3 pb-3 text-neutral-700">
              <div className="rounded-full border border-black/8 bg-white/78 px-3 py-2 text-sm font-medium shadow-[0_10px_26px_rgba(0,0,0,0.08)] backdrop-blur-xl">
                Imagen {viewerIndex + 1} de {imgs.length}
              </div>
              <button
                type="button"
                onClick={closeViewer}
                className="rounded-full border border-black/8 bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,0.18)] backdrop-blur-xl hover:bg-black"
              >
                Cerrar
              </button>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-[28px] border border-black/6 bg-transparent">
              {imgs.length > 1 && (
                <button
                  type="button"
                  onClick={prevViewerImage}
                  className="absolute left-4 top-1/2 z-[2] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white/86 text-3xl font-light leading-none text-neutral-950 shadow-[0_16px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl hover:-translate-x-0.5 hover:bg-white sm:inline-flex"
                  aria-label="Imagen anterior"
                >
                  {"‹"}
                </button>
              )}
              {imgs.length > 1 && (
                <button
                  type="button"
                  onClick={nextViewerImage}
                  className="absolute right-4 top-1/2 z-[2] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-black/8 bg-white/86 text-3xl font-light leading-none text-neutral-950 shadow-[0_16px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl hover:translate-x-0.5 hover:bg-white sm:inline-flex"
                  aria-label="Imagen siguiente"
                >
                  {"›"}
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
                  src={imgs[safeIndex(viewerIndex)]}
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
