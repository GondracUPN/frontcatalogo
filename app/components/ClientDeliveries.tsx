"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ImageZoomViewer from "./ImageZoomViewer";
import { categoryLabel } from "@/lib/catalog-display";
import type { ClientPurchase } from "@/app/actions";

// Fotos reales de entregas, publicadas desde el panel (Servicios → venta →
// foto del cliente, con la opción «mostrar en la web»). Debajo de cada foto el
// dato principal es el equipo comprado; no se muestran nombres ni contactos.

/** «2026-10» → «octubre de 2026», en hora de Lima y sin depender del navegador. */
function monthLabel(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
  return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "America/Lima" }).format(new Date(`${value}-15T12:00:00-05:00`));
}

function DeliveryCard({ item, onOpen, priority = false, className = "" }: { item: ClientPurchase; onOpen: () => void; priority?: boolean; className?: string }) {
  const meta = [item.category ? categoryLabel(item.category) : "", monthLabel(item.purchasedMonth)].filter(Boolean).join(" · ");
  return (
    <figure className={`m-0 flex flex-col ${className}`}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ampliar la foto de la entrega: ${item.productTitle}`}
        className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-[color:var(--surface-muted)] outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--accent-soft)]"
      >
        <Image
          src={item.photoUrl}
          alt={`Entrega de ${item.productTitle}`}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 78vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
        />
        <span aria-hidden="true" className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[color:var(--foreground)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
        </span>
      </button>
      <figcaption className="flex items-start gap-2.5 px-1 pt-3 sm:gap-3">
        {item.productImageUrl && (
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-white sm:h-11 sm:w-11">
            <Image src={item.productImageUrl} alt="" fill sizes="44px" className="object-contain p-0.5" />
          </span>
        )}
        <span className="min-w-0">
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-[color:var(--foreground)] sm:text-[17px]" title={item.productTitle}>{item.productTitle}</span>
          {meta && <span className="block text-sm text-[color:var(--foreground-soft)]">{meta}</span>}
        </span>
      </figcaption>
    </figure>
  );
}

function useViewer(items: ClientPurchase[]) {
  const [index, setIndex] = useState<number | null>(null);
  const viewer = index === null ? null : (
    <ImageZoomViewer
      images={items.map((item) => item.photoUrl)}
      index={index}
      onIndexChange={setIndex}
      onClose={() => setIndex(null)}
      labelFor={(i) => `Entrega de ${items[i]?.productTitle || "un equipo"}`}
    />
  );
  return { open: setIndex, viewer };
}

const HOME_LIMIT = 4;
const AUTO_MS = 4500;

/**
 * Con más de 4 entregas, la portada las muestra todas en una fila que se
 * desplaza: 4 visibles en escritorio, flechas para avanzar o retroceder de una
 * en una y avance automático (en pausa al pasar el mouse, enfocar o tocar).
 */
function ClientDeliveriesCarousel({ items }: { items: ClientPurchase[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);
  const { open, viewer } = useViewer(items);

  const snapTimer = useRef<number | undefined>(undefined);
  const step = useCallback((direction: 1 | -1) => {
    const track = trackRef.current;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const width = card.offsetWidth + gap;
    const max = track.scrollWidth - track.clientWidth;
    const current = Math.round(track.scrollLeft / width);
    const last = Math.ceil((max - 4) / width);
    // En los extremos vuelve al otro lado: el recorrido es circular.
    const next = current + direction > last ? 0 : current + direction < 0 ? last : current + direction;
    // El snap obligatorio pelea con el desplazamiento programado (al volver al
    // inicio se quedaba al final): se apaga mientras dura el movimiento.
    track.style.scrollSnapType = "none";
    void track.offsetWidth; // aplica el cambio de estilo antes de desplazar
    track.scrollTo({ left: Math.min(next * width, max), behavior: "smooth" });
    window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => { track.style.scrollSnapType = ""; }, 700);
  }, []);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") step(1);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, step]);

  const arrow = "inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[color:var(--foreground)] shadow-[0_1px_3px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--brand-tint)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--accent-soft)]";
  return (
    <section aria-labelledby="clients-title" aria-roledescription="carrusel" className="px-4 pt-14 sm:px-6 sm:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div>
            <h2 id="clients-title" className="ms-h2 text-[color:var(--foreground)]">Clientes que ya compraron</h2>
            <p className="mt-2 max-w-[52ch] text-[17px] leading-relaxed text-[color:var(--foreground-soft)] sm:text-lg">Fotos de entregas reales y el equipo que se llevó cada cliente.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/clientes" className="inline-flex min-h-11 items-center text-[17px] font-semibold text-[color:var(--accent-strong)] hover:underline">Ver todas las entregas →</Link>
            <button type="button" onClick={() => step(-1)} aria-label="Cliente anterior" className={arrow}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" onClick={() => step(1)} aria-label="Cliente siguiente" className={arrow}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
        </div>

        <ul
          ref={trackRef}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          className="ms-shelf -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:gap-5 lg:px-0"
        >
          {items.map((item, index) => (
            <li key={item.id} aria-label={`${index + 1} de ${items.length}`} className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[300px] lg:w-[calc((100%-3.75rem)/4)] lg:max-w-none">
              <DeliveryCard item={item} onOpen={() => open(index)} />
            </li>
          ))}
        </ul>
      </div>
      {viewer}
    </section>
  );
}

/** Sección de la portada. Sin fotos publicadas no se muestra nada. */
export function ClientDeliveriesHome({ items }: { items: ClientPurchase[] }) {
  if (items.length > HOME_LIMIT) return <ClientDeliveriesCarousel items={items} />;
  return <ClientDeliveriesRow items={items} />;
}

function ClientDeliveriesRow({ items }: { items: ClientPurchase[] }) {
  const shown = items.slice(0, HOME_LIMIT);
  const { open, viewer } = useViewer(shown);
  if (!shown.length) return null;
  const hasMore = items.length > shown.length;
  // Con la fila llena (4 fotos) no hay tarjeta final: el acceso a la galería va en el título.
  const showGalleryLink = hasMore || shown.length === HOME_LIMIT;
  // Huecos de la fila de escritorio: los ocupa la tarjeta final, nunca cajas vacías.
  const tileSpan = ["lg:col-span-4", "lg:col-span-3", "lg:col-span-2", "lg:col-span-1"][shown.length] || "lg:hidden";

  return (
    <section aria-labelledby="clients-title" className="px-4 pt-14 sm:px-6 sm:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 id="clients-title" className="ms-h2 text-[color:var(--foreground)]">Clientes que ya compraron</h2>
            <p className="mt-2 max-w-[52ch] text-[17px] leading-relaxed text-[color:var(--foreground-soft)] sm:text-lg">Fotos de entregas reales y el equipo que se llevó cada cliente.</p>
          </div>
          {showGalleryLink && <Link href="/clientes" className="inline-flex min-h-11 items-center text-[17px] font-semibold text-[color:var(--accent-strong)] hover:underline">{hasMore ? "Ver todas las entregas" : "Ver galería de entregas"} →</Link>}
        </div>

        <ul className="ms-shelf -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
          {shown.map((item, index) => (
            <li key={item.id} className="w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[300px] lg:w-auto lg:max-w-none">
              <DeliveryCard item={item} onOpen={() => open(index)} />
            </li>
          ))}
          <li className={`w-[78vw] max-w-[320px] shrink-0 snap-start sm:w-[300px] lg:w-auto lg:max-w-none ${tileSpan}`}>
            <div className="flex aspect-[4/5] h-full flex-col justify-end rounded-[24px] bg-[color:var(--brand-tint)] p-7 lg:aspect-auto lg:min-h-full lg:justify-center lg:p-10">
              <p className="max-w-[22ch] text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[color:var(--foreground)] lg:text-[30px]">
                {hasMore ? "Más entregas, más equipos." : "El siguiente puede ser el tuyo."}
              </p>
              <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-[color:var(--foreground-soft)] lg:text-[17px]">Cada equipo se publica con sus fotos, su batería y el precio total con IGV.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={hasMore ? "/clientes" : "/categorias"} className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--accent)] px-5 font-semibold text-white hover:bg-[color:var(--accent-strong)]">
                  {hasMore ? "Ver entregas" : "Ver equipos"}
                </Link>
              </div>
            </div>
          </li>
        </ul>
      </div>
      {viewer}
    </section>
  );
}

/** Galería completa de /clientes, con filtro por categoría si hay varias. */
export function ClientDeliveriesGallery({ items }: { items: ClientPurchase[] }) {
  const [category, setCategory] = useState("todas");
  const categories = useMemo(() => Array.from(new Set(items.map((item) => item.category).filter(Boolean))) as string[], [items]);
  const filtered = category === "todas" ? items : items.filter((item) => item.category === category);
  const { open, viewer } = useViewer(filtered);

  if (!items.length) {
    return (
      <div className="rounded-[24px] bg-white p-8">
        <p className="text-[17px] font-semibold">Pronto publicaremos aquí las fotos de nuevas entregas.</p>
        <p className="mt-2 text-[color:var(--foreground-soft)]">Mientras tanto, revisa los equipos disponibles con sus fotos y su batería.</p>
        <Link href="/categorias" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[color:var(--accent)] px-5 font-semibold text-white hover:bg-[color:var(--accent-strong)]">Ver equipos</Link>
      </div>
    );
  }

  return (
    <div>
      {categories.length > 1 && (
        <div role="group" aria-label="Filtrar entregas por categoría" className="ms-shelf -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {["todas", ...categories].map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={category === key}
              onClick={() => setCategory(key)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold ${category === key ? "bg-[color:var(--foreground)] text-white" : "bg-white text-[color:var(--foreground)] hover:bg-[color:var(--brand-tint)]"}`}
            >
              {key === "todas" ? "Todas" : categoryLabel(key)}
            </button>
          ))}
        </div>
      )}
      <ul className={`grid gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5 lg:grid-cols-4 ${filtered.length > 2 ? "grid-cols-2" : "max-w-sm grid-cols-1 sm:max-w-none"}`}>
        {filtered.map((item, index) => (
          <li key={item.id}>
            <DeliveryCard item={item} onOpen={() => open(index)} priority={index < 2} />
          </li>
        ))}
      </ul>
      {viewer}
    </div>
  );
}
