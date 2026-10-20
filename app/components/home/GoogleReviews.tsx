import { getGoogleReviews } from "@/lib/google-reviews";
import Reveal from "./Reveal";
import { BrandHeading, LeafMark } from "./BrandBits";

// Enlace al local en Google Maps (el mismo de la página de contacto).
const MAPS_FALLBACK = "https://maps.app.goo.gl/ttGMLJEKx4LEwNet6";

function Stars({ value, className = "text-xl" }: { value: number; className?: string }) {
  const percent = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span role="img" aria-label={`${value.toLocaleString("es-PE", { maximumFractionDigits: 1 })} de 5 estrellas`} className={`relative inline-block leading-none tracking-[0.08em] ${className}`}>
      <span aria-hidden="true" className="text-[#d9dde3]">★★★★★</span>
      <span aria-hidden="true" className="absolute inset-0 overflow-hidden whitespace-nowrap text-[#f5a524]" style={{ width: `${percent}%` }}>★★★★★</span>
    </span>
  );
}

/**
 * Reseñas de Google Maps. Con la API configurada muestra la calificación,
 * el total y las reseñas que entrega Google, con su autor y enlace. Sin la
 * API muestra solo una invitación a leerlas en Google Maps.
 */
export default async function GoogleReviews() {
  const data = await getGoogleReviews();
  const mapsUrl = data?.mapsUrl || MAPS_FALLBACK;

  if (!data || (!data.reviews.length && data.rating == null)) {
    return (
      <section aria-labelledby="reviews-title" className="px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="ms-leaf-sm mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 bg-white p-7 sm:flex-row sm:items-center sm:p-9">
          <div>
            <h2 id="reviews-title" className="flex items-center gap-3 text-[24px] font-semibold tracking-[-0.02em]">
              <LeafMark className="h-6 w-6" />
              Lo que dicen nuestros clientes
            </h2>
            <p className="mt-2 text-[17px] text-[color:var(--foreground-soft)]">Lee las reseñas de Macsomenos en Google Maps.</p>
          </div>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-full bg-[color:var(--foreground)] px-6 text-base font-semibold text-white hover:bg-black">
            Ver reseñas en Google
          </a>
        </div>
      </section>
    );
  }

  return (
    <Reveal aria-labelledby="reviews-title" className="px-4 pt-14 sm:px-6 sm:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <BrandHeading id="reviews-title" title="Lo que dicen nuestros clientes" />
          {data.rating != null && (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" data-reveal className="ms-leaf-sm flex items-center gap-4 bg-white px-5 py-3 hover:bg-[color:var(--brand-tint)]">
              <span className="text-[32px] font-bold leading-none tracking-[-0.03em]">{data.rating.toLocaleString("es-PE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span>
                <Stars value={data.rating} />
                <span className="mt-1 block text-[13px] text-[color:var(--foreground-soft)]">
                  {data.total != null ? `${data.total.toLocaleString("es-PE")} reseñas en Google` : "Reseñas en Google"}
                </span>
              </span>
            </a>
          )}
        </div>
        {data.reviews.length > 0 && (
          <ul className="ms-shelf -mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6">
            {data.reviews.map((review, index) => (
              <li key={`${review.author}-${index}`} data-reveal style={{ "--reveal-order": index } as React.CSSProperties} className="ms-store-card flex w-[82vw] max-w-[360px] shrink-0 snap-start flex-col rounded-[24px] bg-white p-6">
                <div className="flex items-center gap-3">
                  {review.authorPhoto ? (
                    // Foto pública del autor servida por Google; no pasa por el optimizador de imágenes.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={review.authorPhoto} alt="" width={40} height={40} loading="lazy" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--brand-tint)] font-semibold text-[color:var(--accent)]">{review.author.charAt(0)}</span>
                  )}
                  <span className="min-w-0">
                    {review.authorUrl ? (
                      <a href={review.authorUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-[15px] font-semibold hover:underline">{review.author}</a>
                    ) : (
                      <span className="block truncate text-[15px] font-semibold">{review.author}</span>
                    )}
                    {review.relativeTime && <span className="block text-[13px] text-[color:var(--foreground-soft)]">{review.relativeTime}</span>}
                  </span>
                </div>
                <div className="mt-3"><Stars value={review.rating} className="text-base" /></div>
                {review.text && <p className="mt-3 line-clamp-6 text-[15px] leading-relaxed text-[color:var(--foreground)]">{review.text}</p>}
                {review.reviewUrl && (
                  <a href={review.reviewUrl} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex min-h-10 items-center pt-4 text-[15px] font-semibold text-[color:var(--accent)] hover:underline">
                    Ver en Google
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[13px] text-[color:var(--foreground-soft)]">
          Reseñas publicadas en Google Maps.{" "}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--accent)] hover:underline">Ver todas o dejar la tuya</a>
        </p>
      </div>
    </Reveal>
  );
}
