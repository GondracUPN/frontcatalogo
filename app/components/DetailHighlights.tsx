"use client";

// Acceso compacto a los detalles estéticos junto al precio. «Ver detalles»
// cambia la galería de la misma ficha al grupo de fotos de detalles (no abre
// otra vista). Las observaciones registradas se muestran aquí una sola vez.

export const OPEN_GALLERY_EVENT = "ms:open-gallery";
export const SHOW_DETAILS_EVENT = "ms:gallery-show-details";

export function openGalleryAt(index: number) {
  window.dispatchEvent(new CustomEvent(OPEN_GALLERY_EVENT, { detail: { index } }));
}

export function showGalleryDetails() {
  window.dispatchEvent(new CustomEvent(SHOW_DETAILS_EVENT));
  const gallery = document.getElementById("galeria");
  if (gallery) {
    const top = gallery.getBoundingClientRect().top;
    // En escritorio la galería es fija al lado; solo se desplaza si no está a la vista.
    if (top < 0 || top > window.innerHeight * 0.6) gallery.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export default function DetailHighlights({ photoCount, observations }: { photoCount: number; observations: string[] }) {
  if (!photoCount && !observations.length) return null;
  return (
    <section aria-labelledby="detail-highlights-title" className="border-l-[3px] border-amber-400 pl-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="detail-highlights-title" className="text-sm font-semibold text-[color:var(--foreground)]">
          Detalles estéticos
          {photoCount > 0 && <span className="font-normal text-[color:var(--foreground-soft)]"> · {photoCount} {photoCount === 1 ? "foto" : "fotos"}</span>}
        </h2>
        {photoCount > 0 && (
          <button
            type="button"
            onClick={showGalleryDetails}
            aria-controls="galeria"
            className="inline-flex min-h-9 items-center gap-1 rounded-full text-sm font-semibold text-[color:var(--accent-strong)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
          >
            Ver detalles <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
      {observations.length > 0 && (
        <ul className="mt-0.5 space-y-0.5 text-[13px] leading-5 text-[color:var(--foreground)]">
          {observations.map((text) => <li key={text}>{text}</li>)}
        </ul>
      )}
    </section>
  );
}
