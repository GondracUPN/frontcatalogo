// Piezas de identidad de Macsomenos: la hoja del logo como sello que se
// repite en la portada, para que el cliente reconozca la marca poco a poco.

/** La hoja del logo, recortada del mismo trazo que BrandLogo. */
export function LeafMark({ className = "h-5 w-5", color = "var(--accent)" }: { className?: string; color?: string }) {
  return (
    <svg aria-hidden="true" viewBox="495 180 200 215" className={className}>
      <path fill={color} d="M507 384 C500 295 560 205 680 188 C686 290 625 372 507 384 Z" />
    </svg>
  );
}

/** Título de sección con la hoja de la marca y una línea de apoyo opcional. */
export function BrandHeading({ id, title, note }: { id: string; title: string; note?: string }) {
  return (
    <div data-reveal>
      <h2 id={id} className="ms-h2 flex items-start gap-3 text-[color:var(--foreground)]">
        <LeafMark className="mt-[0.2em] h-[0.8em] w-[0.8em] shrink-0" />
        <span>{title}</span>
      </h2>
      {note && <p className="mt-2 max-w-[56ch] text-[17px] leading-relaxed text-[color:var(--foreground-soft)] sm:text-lg">{note}</p>}
    </div>
  );
}
