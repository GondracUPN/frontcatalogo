"use client";

import React from "react";

// Estante horizontal de la tienda: tarjetas que se deslizan
// con el dedo o con las flechas. Sin JavaScript sigue siendo una fila con scroll.
export default function StoreShelf({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [edges, setEdges] = React.useState({ start: true, end: false });

  const update = React.useCallback(() => {
    const node = ref.current;
    if (!node) return;
    setEdges({ start: node.scrollLeft <= 4, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 4 });
  }, []);

  React.useEffect(() => {
    update();
    const node = ref.current;
    if (!node) return;
    node.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      node.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const move = (direction: 1 | -1) => {
    const node = ref.current;
    if (!node) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="ms-shelf -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-8 pt-2 sm:-mx-6 sm:gap-5 sm:px-6"
      >
        {children}
      </div>
      <div className="mt-1 hidden justify-end gap-3 sm:flex">
        <button type="button" onClick={() => move(-1)} disabled={edges.start} aria-label="Ver anteriores" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--foreground)] text-xl text-white hover:bg-[color:var(--accent)] disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--foreground-soft)]">‹</button>
        <button type="button" onClick={() => move(1)} disabled={edges.end} aria-label="Ver siguientes" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--foreground)] text-xl text-white hover:bg-[color:var(--accent)] disabled:bg-[color:var(--surface-muted)] disabled:text-[color:var(--foreground-soft)]">›</button>
      </div>
    </div>
  );
}
