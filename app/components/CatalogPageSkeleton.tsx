"use client";

// Componente cliente a propósito: los loading.tsx forman parte de la carga RSC
// de cada página; así solo viaja una referencia y el marcado va en el JS (que
// el navegador guarda en caché) en lugar de repetirse en cada respuesta.

import { CATALOG_GRID_CLASS, CatalogProductCardSkeleton } from "./CatalogProductCard";

// Estado de carga con la misma estructura que /c/[categoria] y CategoryBrowser:
// ruta de navegación, cabecera, filtros (solo escritorio), barra de búsqueda y
// grilla de tarjetas. Así la página no cambia de forma al llegar los datos.

export function CatalogBrowserSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
      <div className="hidden lg:block">
        <div className="surface-card soft-outline space-y-4 p-5">
          <div className="skeleton-block h-3 w-16 rounded-full" />
          <div className="rounded-[24px] border border-black/6 bg-white/70 p-4">
            <div className="skeleton-block h-4 w-28 rounded-full" />
            <div className="skeleton-block mt-4 h-20 rounded-2xl" />
            <div className="mt-4 grid grid-cols-2 gap-3"><div className="skeleton-block h-14 rounded-[18px]" /><div className="skeleton-block h-14 rounded-[18px]" /></div>
          </div>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-[26px] border border-black/6 bg-white/70 p-4">
              <div className="skeleton-block h-4 w-24 rounded-full" />
              <div className="mt-3 space-y-2"><div className="skeleton-block h-11 rounded-[18px]" /><div className="skeleton-block h-11 rounded-[18px]" /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="surface-card soft-outline p-3 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="skeleton-block h-3 w-20 rounded-full" />
            <div className="skeleton-block mt-3 h-7 w-56 rounded-full" />
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[420px]">
            <div className="skeleton-block h-11 w-full rounded-full" />
            <div className="flex gap-3"><div className="skeleton-block h-10 flex-1 rounded-full sm:w-52 sm:flex-none" /><div className="skeleton-block h-10 w-36 rounded-full" /></div>
          </div>
        </div>
        <div className={`mt-6 ${CATALOG_GRID_CLASS}`}>
          {Array.from({ length: cards }).map((_, index) => <CatalogProductCardSkeleton key={index} />)}
        </div>
      </div>
    </div>
  );
}

export default function CatalogPageSkeleton() {
  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6" role="status" aria-label="Cargando catálogo">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 px-2"><div className="skeleton-block h-4 w-56 rounded-full" /></div>
        <div className="surface-card-strong soft-outline overflow-hidden px-3 py-6 sm:px-8 sm:py-10">
          <div className="max-w-3xl px-3 sm:px-0">
            <div className="skeleton-block h-7 w-28 rounded-full" />
            <div className="skeleton-block mt-5 h-10 w-4/5 rounded-2xl sm:h-12 lg:h-14" />
            <div className="skeleton-block mt-3 h-10 w-1/2 rounded-2xl sm:h-12 lg:h-14" />
          </div>
          <CatalogBrowserSkeleton />
        </div>
      </div>
    </div>
  );
}

// Misma estructura que la ficha: ruta de navegación, galería (marco 4:3 con el
// fondo de las fotos y miniaturas) y columna de compra (estado, título, resumen,
// caja de precio y especificaciones). Evita un bloque blanco y saltos al cargar.
export function ProductPageSkeleton() {
  return (
    <div className="overflow-x-hidden px-2 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6" role="status" aria-label="Cargando equipo">
      <div className="mx-auto min-w-0 max-w-7xl">
        <div className="mb-4 px-2"><div className="skeleton-block h-4 w-64 max-w-full rounded-full" /></div>
        <section className="surface-card-strong soft-outline overflow-hidden px-3 py-5 sm:px-8 sm:py-10">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(340px,1.04fr)] lg:items-start lg:gap-8">
            <div className="min-w-0 space-y-3">
              <div className="relative mx-auto aspect-[4/3] max-h-[68svh] w-full overflow-hidden rounded-[18px] bg-[linear-gradient(145deg,#f8fafc,#edf2f7)] sm:max-w-[760px] sm:rounded-[30px] lg:rounded-[34px]">
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="h-9 w-9 animate-spin rounded-full border-[3px] border-slate-300 border-t-slate-500" />
                </div>
              </div>
              <div className="mx-auto flex gap-1.5 overflow-hidden sm:max-w-[760px] sm:gap-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="skeleton-block h-14 w-14 shrink-0 rounded-[15px] sm:h-[4.5rem] sm:w-[4.5rem] sm:rounded-[20px] md:h-[5.5rem] md:w-[5.5rem]" />
                ))}
              </div>
            </div>
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <div className="flex gap-2">
                <div className="skeleton-block h-8 w-28 rounded-full" />
                <div className="skeleton-block h-8 w-24 rounded-full" />
              </div>
              <div>
                <div className="skeleton-block h-8 w-4/5 rounded-2xl sm:h-10" />
                <div className="skeleton-block mt-3 h-5 w-3/5 rounded-full" />
                <div className="skeleton-block mt-3 h-16 w-full rounded-2xl" />
              </div>
              <div className="rounded-[22px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(239,244,250,0.94))] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-6">
                <div className="skeleton-block h-3 w-32 rounded-full" />
                <div className="skeleton-block mt-4 h-4 w-48 rounded-full" />
                <div className="skeleton-block mt-4 h-3 w-24 rounded-full" />
                <div className="skeleton-block mt-2 h-9 w-52 rounded-2xl" />
                <div className="skeleton-block mt-5 h-12 w-full rounded-full" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="skeleton-block h-16 rounded-[18px]" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


// Carga genérica (inicio, ofertas, búsqueda, novedades…). Las rutas con un
// diseño propio (categorías y fichas) tienen su loading.tsx. Usa la misma
// tarjeta y la misma grilla de 3 columnas que el catálogo real.
export function GenericPageSkeleton() {
  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6" role="status" aria-label="Cargando">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="surface-card-strong soft-outline overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="skeleton-block h-7 w-28 rounded-full" />
            <div className="skeleton-block mt-5 h-10 w-3/4 max-w-xl rounded-2xl sm:h-12" />
            <div className="skeleton-block mt-4 h-4 w-1/2 max-w-md rounded-full" />
          </div>
        </section>

        <section className={CATALOG_GRID_CLASS}>
          {Array.from({ length: 6 }).map((_, index) => <CatalogProductCardSkeleton key={index} />)}
        </section>
      </div>
    </div>
  );
}
