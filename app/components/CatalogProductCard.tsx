import Image from "next/image";
import Link from "next/link";
import PriceWithIgv from "./PriceWithIgv";
import ThemedSaleBadge from "./theme/ThemedSaleBadge";
import { badgeTone, productBadges, type ProductBadge } from "@/lib/catalog-display";

// Tarjeta de equipo para categorías, búsqueda y ofertas.
//
// Alineación: la tarjeta ocupa 5 filas del grid padre con `grid-rows-subgrid`
// (foto, título, características, precio y acciones). Cada fila mide lo que
// necesite la tarjeta más alta de esa fila del catálogo; así los precios y los
// botones quedan a la misma altura sin reservar huecos fijos. En móvil, con una
// columna, no hay espacio vacío.
//
// Toda la tarjeta enlaza a la ficha mediante el título (enlace extendido con
// `after:`); el botón de comparar queda por encima.
//
// En móvil (< 640 px) la tarjeta es horizontal: foto cuadrada a la izquierda y
// los datos a la derecha, para ver varios equipos por pantalla. Los distintivos
// pasan de la foto a una fila propia (la 1.ª de las 5) para no tapar la imagen,
// y «Comparar» se coloca bajo la foto, a la altura del precio.

export const CATALOG_CARD_ROWS = 5;

/** Clases del grid que contiene tarjetas. */
export const CATALOG_GRID_CLASS = "grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 xl:grid-cols-3";

/** Tamaño mostrado de la foto: miniatura en móvil, 2 columnas en tablet y 3 en escritorio (máx. ~300 px). */
export const CATALOG_CARD_IMAGE_SIZES = "(min-width: 1280px) 300px, (min-width: 640px) 46vw, 128px";

export type CatalogCardData = {
  slug: string;
  title: string;
  image: string;
  color?: string;
  specLines: string[];
  aestheticLabel?: string;
  /** "Agotado" atenúa la foto; «Disponible» ya no se muestra como etiqueta. */
  availabilityLabel: string;
  condition?: string;
  saleType?: string;
  promoLabel?: string;
  stockLabel?: string;
  price: number;
  compareAt?: number | null;
};

function Badge({ badge, small = false }: { badge: ProductBadge; small?: boolean }) {
  if (badge.kind === "promo") return <ThemedSaleBadge label={badge.label} size="sm" />;
  const tone = badgeTone(badge);
  return <span className={`rounded-full font-semibold ${small ? "px-2 py-0.5" : "px-2.5 py-1 shadow-sm"} text-[11px] ${tone}`}>{badge.label}</span>;
}

export default function CatalogProductCard({
  data,
  priority = false,
  compare,
}: {
  data: CatalogCardData;
  priority?: boolean;
  compare?: { selected: boolean; disabled: boolean; onToggle: () => void };
}) {
  const { slug, title, image, color, specLines, aestheticLabel, availabilityLabel, condition, saleType = "", promoLabel, stockLabel, price, compareAt } = data;
  const soldOut = availabilityLabel === "Agotado";
  // Máximo tres etiquetas con prioridad (preventa > promoción > condición > negociable).
  const badges = productBadges({ condition, saleType, promoLabel, availability: soldOut ? "sold" : "" });
  const topBadges = badges.filter((badge) => badge.kind !== "promo");
  const promoBadge = badges.find((badge) => badge.kind === "promo");

  return (
    <article className="catalog-product-card group relative row-span-5 grid grid-cols-[minmax(0,112px)_minmax(0,1fr)] grid-rows-subgrid gap-x-3 gap-y-0 rounded-[22px] border border-black/[0.06] bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.05)] transition-shadow duration-200 hover:shadow-[0_1px_2px_rgba(15,23,42,0.06),0_14px_32px_rgba(15,23,42,0.1)] focus-within:ring-2 focus-within:ring-[color:var(--accent)] min-[400px]:grid-cols-[minmax(0,128px)_minmax(0,1fr)] sm:grid-cols-1 sm:rounded-[26px] sm:p-4">
      {/* 1. Foto: cuadrada en móvil, 4:3 desde tablet. */}
      <div className="relative row-span-3 aspect-square self-start overflow-hidden rounded-[16px] bg-[linear-gradient(145deg,#f5f7fa,#ebf0f6)] sm:row-span-1 sm:aspect-[4/3] sm:rounded-[20px]">
        <Image
          src={image || "/placeholder.svg"}
          alt={title}
          fill
          sizes={CATALOG_CARD_IMAGE_SIZES}
          priority={priority}
          className={`object-contain transition duration-300 group-hover:scale-[1.03] ${soldOut ? "opacity-60" : ""}`}
        />
        {topBadges.length > 0 && (
          <div className="absolute inset-x-2.5 top-2.5 hidden flex-wrap gap-1.5 sm:flex">
            {topBadges.map((badge) => <Badge key={badge.kind} badge={badge} />)}
          </div>
        )}
        {promoBadge && (
          <div className="absolute inset-x-2.5 bottom-2.5 hidden flex-wrap gap-1.5 sm:flex">
            <Badge badge={promoBadge} />
          </div>
        )}
      </div>

      {/* Distintivos en móvil (fila propia para no tapar la foto). */}
      <div className="col-start-2 flex min-h-5 flex-wrap items-center gap-1 sm:hidden">
        {badges.map((badge) => <Badge key={badge.kind} badge={badge} small />)}
      </div>

      {/* 2. Título: hasta 2 líneas. */}
      <h3 className="col-start-2 mt-1.5 line-clamp-2 text-[16px] font-semibold leading-[1.3] tracking-[-0.02em] text-[color:var(--foreground)] sm:col-start-1 sm:mt-3.5 sm:text-[17px] sm:leading-6">
        <Link href={`/product/${slug}`} className="outline-none after:absolute after:inset-0 after:rounded-[22px] after:content-[''] sm:after:rounded-[26px]">
          {title}
        </Link>
      </h3>

      {/* 3. Características: color, configuración, batería y estado estético. */}
      <div className="col-start-2 mt-1 space-y-0.5 text-[13px] leading-[1.35] text-[color:var(--foreground-soft)] sm:col-start-1 sm:mt-1.5 sm:text-sm sm:leading-5">
        {color && <p className="truncate">Color: {color}</p>}
        {specLines.map((line) => <p key={line} className="font-medium">{line}</p>)}
        {stockLabel && <p className="font-semibold text-[#1f6c43]">{stockLabel}</p>}
        {aestheticLabel && <p className="pt-1 sm:pt-1.5"><span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">{aestheticLabel}</span></p>}
      </div>

      {/* 4. Precio: alineado abajo para que el total con IGV coincida en la fila. */}
      <div className="col-start-2 mt-2 flex flex-col justify-end border-t border-black/[0.06] pt-2 sm:col-start-1 sm:mt-3 sm:pt-3">
        <PriceWithIgv price={Number(price)} compareAt={compareAt} />
      </div>

      {/* 5. Acciones. */}
      <div className="col-start-1 row-start-4 flex items-end justify-start gap-2 self-end sm:row-start-auto sm:mt-3 sm:items-center sm:justify-between sm:self-auto">
        <span aria-hidden="true" className="hidden text-sm font-semibold text-[color:var(--accent)] sm:inline">Ver equipo →</span>
        {compare && (
          <button
            type="button"
            aria-pressed={compare.selected}
            aria-label={`${compare.selected ? "Quitar de la comparación" : "Añadir a la comparación"}: ${title}`}
            disabled={compare.disabled}
            onClick={compare.onToggle}
            className={`relative z-[1] inline-flex min-h-11 w-full shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-2 text-[13px] font-semibold sm:w-auto sm:px-4 sm:text-sm disabled:opacity-50 ${compare.selected ? "border-blue-600 bg-blue-50 text-blue-800" : "border-[color:var(--border)] bg-slate-50 text-slate-800 hover:border-slate-400"}`}
          >
            {compare.selected ? "✓ Comparando" : "+ Comparar"}
          </button>
        )}
      </div>
    </article>
  );
}

/** Esqueleto con la misma estructura que la tarjeta real. */
export function CatalogProductCardSkeleton() {
  return (
    <div aria-hidden="true" className="row-span-5 grid grid-cols-[minmax(0,112px)_minmax(0,1fr)] grid-rows-subgrid gap-x-3 gap-y-0 rounded-[22px] border border-black/[0.06] bg-white p-2.5 min-[400px]:grid-cols-[minmax(0,128px)_minmax(0,1fr)] sm:grid-cols-1 sm:rounded-[26px] sm:p-4">
      <div className="skeleton-block row-span-3 aspect-square self-start rounded-[16px] sm:row-span-1 sm:aspect-[4/3] sm:rounded-[20px]" />
      <div className="col-start-2 flex gap-1 sm:hidden"><div className="skeleton-block h-5 w-16 rounded-full" /><div className="skeleton-block h-5 w-12 rounded-full" /></div>
      <div className="col-start-2 mt-2 space-y-2 sm:col-start-1 sm:mt-3.5"><div className="skeleton-block h-4 w-4/5 rounded-full" /><div className="skeleton-block h-4 w-1/2 rounded-full" /></div>
      <div className="col-start-2 mt-2 space-y-2 sm:col-start-1 sm:mt-2.5"><div className="skeleton-block h-3.5 w-2/5 rounded-full" /><div className="skeleton-block h-3.5 w-3/5 rounded-full" /></div>
      <div className="col-start-2 mt-2 space-y-2 border-t border-black/[0.06] pt-2 sm:col-start-1 sm:mt-3 sm:pt-3"><div className="skeleton-block h-3.5 w-1/2 rounded-full" /><div className="skeleton-block h-3 w-1/4 rounded-full" /><div className="skeleton-block h-6 w-2/5 rounded-full" /></div>
      <div className="col-start-1 row-start-4 flex items-end self-end sm:row-start-auto sm:mt-3 sm:items-center sm:justify-between sm:self-auto"><div className="skeleton-block hidden h-4 w-20 rounded-full sm:block" /><div className="skeleton-block h-11 w-28 rounded-full" /></div>
    </div>
  );
}
