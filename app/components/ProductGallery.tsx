"use client";
import Image from "next/image";
import React from "react";
import dynamic from "next/dynamic";
import { OPEN_GALLERY_EVENT, SHOW_DETAILS_EVENT } from "./DetailHighlights";

// Ancho real del marco: toda la pantalla hasta 1024 px; en escritorio, la
// columna izquierda de la ficha (~620 px como máximo).
const GALLERY_IMAGE_SIZES = "(min-width: 1280px) 620px, (min-width: 1024px) 48vw, 100vw";
const ImageZoomViewer = dynamic(() => import("./ImageZoomViewer"), { ssr: false });

export default function ProductGallery({ images, detailImages = [], sold }: { images: string[]; detailImages?: string[]; sold?: boolean }) {
  const imgs = React.useMemo(
    () => {
      const primary = Array.isArray(images) ? images.filter(Boolean) : [];
      const details = Array.isArray(detailImages) ? detailImages.filter((url) => url && !primary.includes(url)) : [];
      return primary.length || details.length ? [...primary, ...details] : ["/placeholder.svg"];
    },
    [images, detailImages]
  );
  const primaryCount = Array.isArray(images) ? images.filter(Boolean).length : 0;
  const [active, setActive] = React.useState(0);
  const [viewerIndex, setViewerIndex] = React.useState(0);
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [mainDragOffset, setMainDragOffset] = React.useState(0);
  const [mainDragging, setMainDragging] = React.useState(false);
  const [mainTrackIndex, setMainTrackIndex] = React.useState(imgs.length > 1 ? 1 : 0);
  const [mainAnimating, setMainAnimating] = React.useState(false);
  const imageSignature = React.useMemo(() => imgs.join("|"), [imgs]);
  const wrapIndex = React.useCallback((i: number) => {
    if (!imgs.length) return 0;
    return ((i % imgs.length) + imgs.length) % imgs.length;
  }, [imgs.length]);
  const carouselImages = React.useMemo(
    () => (imgs.length > 1 ? [imgs[imgs.length - 1], ...imgs, imgs[0]] : imgs),
    [imgs]
  );
  const mainImageFitClass = "object-contain";
  // Fotos ya descargadas: mientras una no termina, se ve un indicador en el
  // fondo gris del marco en lugar de un hueco vacío.
  const [loadedSources, setLoadedSources] = React.useState<Set<string>>(() => new Set());
  const markLoaded = React.useCallback((src: string) => {
    setLoadedSources((current) => (current.has(src) ? current : new Set(current).add(src)));
  }, []);
  // Fotos que no se pudieron descargar: se muestra un aviso en su lugar,
  // nunca otra foto (podría ser de otro equipo).
  const [failedSources, setFailedSources] = React.useState<Set<string>>(() => new Set());
  const markFailed = React.useCallback((src: string) => {
    setFailedSources((current) => (current.has(src) ? current : new Set(current).add(src)));
  }, []);
  const mainFrameAspect = "aspect-[4/3]";
  const trackElRef = React.useRef<HTMLDivElement | null>(null);
  const dragFrameRef = React.useRef<number | null>(null);
  const thumbRailRef = React.useRef<HTMLDivElement | null>(null);
  const mainSwipeRef = React.useRef<{ active: boolean; dragging: boolean; x: number; y: number }>({ active: false, dragging: false, x: 0, y: 0 });
  const mainAnimationTimerRef = React.useRef<number | null>(null);
  const suppressOpenRef = React.useRef(false);
  const viewerTriggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    setActive(0);
    setViewerIndex(0);
    setFailedSources(new Set());
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

  const openViewer = (index = active) => {
    if (suppressOpenRef.current) {
      suppressOpenRef.current = false;
      return;
    }
    setViewerIndex(index);
    setViewerOpen(true);
  };

  // Otros bloques de la ficha (detalles estéticos) abren el visor en una foto concreta.
  React.useEffect(() => {
    const onOpen = (event: Event) => {
      const index = Number((event as CustomEvent<{ index?: number }>).detail?.index ?? 0);
      if (!Number.isFinite(index) || index < 0 || index >= imgs.length) return;
      suppressOpenRef.current = false;
      setViewerIndex(index);
      setViewerOpen(true);
    };
    window.addEventListener(OPEN_GALLERY_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_GALLERY_EVENT, onOpen);
  }, [imgs.length]);

  const detailCount = imgs.length - primaryCount;

  // «Ver detalles» (junto al precio): cambia al grupo de fotos estéticas.
  React.useEffect(() => {
    const onShowDetails = () => { if (detailCount > 0) goToImage(primaryCount); };
    window.addEventListener(SHOW_DETAILS_EVENT, onShowDetails);
    return () => window.removeEventListener(SHOW_DETAILS_EVENT, onShowDetails);
  // goToImage se declara más abajo y solo depende del número de fotos.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailCount, primaryCount, imgs.length]);

  const closeViewer = () => {
    setViewerOpen(false);
    // La foto principal queda en la última que se vio ampliada.
    if (viewerIndex !== active) {
      setActive(viewerIndex);
      setMainTrackIndex(imgs.length > 1 ? viewerIndex + 1 : 0);
      setMainAnimating(false);
    }
    window.setTimeout(() => viewerTriggerRef.current?.focus(), 0);
  };

  const goToImage = React.useCallback((index: number) => {
    const target = wrapIndex(index);
    setActive(target);
    setMainTrackIndex(imgs.length > 1 ? target + 1 : 0);
    setMainAnimating(imgs.length > 1);
    setMainDragging(false);
    setMainDragOffset(0);
  }, [imgs.length, wrapIndex]);

  const slideMainImage = React.useCallback((direction: -1 | 1) => {
    if (imgs.length <= 1) return;
    if (mainAnimationTimerRef.current !== null) window.clearTimeout(mainAnimationTimerRef.current);
    setActive((current) => wrapIndex(current + direction));
    setMainAnimating(true);
    setMainDragging(false);
    setMainDragOffset(0);
    setMainTrackIndex((current) => current + direction);
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
    const width = event.currentTarget.getBoundingClientRect().width || 1;
    const offset = Math.max(-width, Math.min(width, dx));
    // Sin re-renderizar React en cada movimiento: se escribe el transform directo.
    if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;
      const el = trackElRef.current;
      if (!el) return;
      el.style.transition = "none";
      el.style.transform = `translate3d(calc(${-(active + 1) * 100}% + ${offset}px), 0, 0)`;
    });
  };

  const handleMainTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
    }
    const swipe = mainSwipeRef.current;
    const el = trackElRef.current;
    // Se quita el "transition: none" del arrastre; React anima el cambio de foto.
    if (el && swipe.dragging) el.style.transition = "";
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
    if (el && wasDragging) {
      // Vuelve a la misma foto: la posición final es la misma que React ya
      // tiene, así que se anima directamente en el DOM.
      el.style.transition = "transform 380ms cubic-bezier(0.22,1,0.36,1)";
      el.style.transform = `translate3d(${-(active + 1) * 100}%, 0, 0)`;
    }
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

  // La miniatura de la foto visible siempre queda a la vista en la tira.
  React.useEffect(() => {
    const rail = thumbRailRef.current;
    const thumb = rail?.children[active] as HTMLElement | undefined;
    if (!rail || !thumb) return;
    const left = thumb.offsetLeft - rail.offsetLeft;
    if (left < rail.scrollLeft || left + thumb.offsetWidth > rail.scrollLeft + rail.clientWidth) {
      rail.scrollTo({ left: left - (rail.clientWidth - thumb.offsetWidth) / 2, behavior: "smooth" });
    }
  }, [active]);

  const scrollThumbs = (direction: -1 | 1) => {
    thumbRailRef.current?.scrollBy({ left: direction * 260, behavior: "smooth" });
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
          ref={viewerTriggerRef}
          type="button"
          onClick={() => openViewer()}
          className="absolute inset-0 z-[2] cursor-zoom-in"
          aria-label="Abrir imagen en grande"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.32),transparent_42%)]" />
        <div
          ref={trackElRef}
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
            const isCurrent = index === mainTrackIndex;
            return (
              <div key={`${src}-${index}`} className="relative h-full w-full shrink-0">
                {shouldLoad && failedSources.has(src) && (
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center text-sm text-[color:var(--foreground-soft)]">
                    <span className="font-semibold text-[color:var(--foreground)]">No se pudo cargar esta foto</span>
                    <span>Prueba con la siguiente o vuelve a cargar la página.</span>
                  </span>
                )}
                {shouldLoad && !loadedSources.has(src) && !failedSources.has(src) && (
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
                    <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-300/80 border-t-slate-500" />
                  </span>
                )}
                {shouldLoad && !failedSources.has(src) && (
                  <Image
                    src={src}
                    alt="Vista del producto"
                    fill
                    sizes={GALLERY_IMAGE_SIZES}
                    // Sin ocultar la foto hasta onLoad: la primera llega en el HTML
                    // y no debe esperar a la hidratación (LCP). El indicador queda
                    // detrás y la foto lo tapa al pintarse.
                    className={`h-full w-full ${mainImageFitClass}`}
                    // La foto actual tiene prioridad; la anterior y la siguiente se
                    // cargan ya (no `lazy`): están fuera de la vista dentro de un
                    // carrusel desplazado y `lazy` las pediría recién al deslizar,
                    // dejando el marco vacío durante la transición.
                    {...(isCurrent ? { priority: true } : { loading: "eager" as const })}
                    onLoad={() => markLoaded(src)}
                    onError={() => markFailed(src)}
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
        {active >= primaryCount && (
          <div className="absolute left-3 top-3 z-[3] rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900 sm:left-4 sm:top-4">Detalle estético</div>
        )}
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
      {/* Acceso rápido: fotos del equipo y fotos de detalles, sin perder ninguna. */}
      {imgs.length > 1 && (
        <div className="mx-auto flex w-full max-w-[760px] flex-wrap items-center gap-2">
          {primaryCount > 0 && detailCount > 0 ? (
            <div role="group" aria-label="Elegir fotos" className="flex min-w-0 flex-1 gap-2">
              <button
                type="button"
                onClick={() => goToImage(0)}
                aria-pressed={active < primaryCount}
                className={`min-h-11 flex-1 rounded-full px-3 text-sm font-semibold transition-colors sm:flex-none sm:px-4 ${active < primaryCount ? "bg-[color:var(--foreground)] text-white" : "bg-[color:var(--surface-muted)] text-[color:var(--foreground)] hover:bg-[color:var(--border-strong)]"}`}
              >
                Fotos del equipo · {primaryCount}
              </button>
              <button
                type="button"
                onClick={() => goToImage(primaryCount)}
                aria-pressed={active >= primaryCount}
                className={`min-h-11 flex-1 rounded-full px-3 text-sm font-semibold transition-colors sm:flex-none sm:px-4 ${active >= primaryCount ? "bg-amber-400 text-amber-950" : "bg-amber-100 text-amber-900 hover:bg-amber-200"}`}
              >
                Detalles estéticos · {detailCount}
              </button>
            </div>
          ) : (
            <span className="flex-1 text-sm text-[color:var(--foreground-soft)]">{imgs.length} fotos</span>
          )}
          <button type="button" onClick={() => openViewer(active)} className="hidden min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-[color:var(--accent-strong)] hover:bg-[color:var(--brand-tint)] sm:inline-flex">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            Ampliar
          </button>
        </div>
      )}
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
              aria-label={i >= primaryCount ? `Ver detalle estético ${i - primaryCount + 1}` : `Ver foto ${i + 1} del producto`}
              onClick={() => goToImage(i)}
              aria-current={i === active ? "true" : undefined}
              className={`shrink-0 snap-start overflow-hidden rounded-[15px] border-2 p-0.5 transition-colors sm:rounded-[20px] ${
                i === active
                  ? "border-[color:var(--accent)] bg-[color:var(--brand-tint)]"
                  : i >= primaryCount
                    ? "border-amber-300 bg-amber-50 opacity-90 hover:opacity-100"
                    : "border-transparent bg-white/82 opacity-80 hover:border-black/15 hover:opacity-100"
              }`}
            >
              <div className="relative h-14 w-14 overflow-hidden rounded-[11px] bg-[linear-gradient(145deg,#f6f8fb,#e8edf4)] sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[14px] md:h-[5.5rem] md:w-[5.5rem]">
                {failedSources.has(u) ? (
                  <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-[color:var(--foreground-soft)]">Sin foto</span>
                ) : (
                  <Image src={u} alt={i >= primaryCount ? "Miniatura de detalle estético" : "Miniatura del producto"} fill sizes="88px" loading="lazy" onError={() => markFailed(u)} className="h-full w-full object-cover" />
                )}
                {i >= primaryCount && <span className="absolute inset-x-0 bottom-0 bg-amber-950/85 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white">Detalle</span>}
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
        <ImageZoomViewer
          images={imgs}
          index={viewerIndex}
          onIndexChange={setViewerIndex}
          onClose={closeViewer}
          detailStart={primaryCount > 0 && detailCount > 0 ? primaryCount : undefined}
          labelFor={(i) => (i >= primaryCount ? "Detalle estético ampliado del equipo" : "Vista ampliada del producto")}
        />
      )}
    </div>
  );
}
