"use client";
import React from "react";
import ComparisonView from "./ComparisonView";
import { loadComparison } from "@/lib/comparison-client";
import type { CompareItem } from "@/lib/catalog-comparison";

export default function CompareDialog({ slugs, onClose, onRemove }: { slugs: string[]; onClose: () => void; onRemove: (slug: string) => void }) {
  const [items, setItems] = React.useState<CompareItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [retry, setRetry] = React.useState(0);
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const loadedRef = React.useRef<CompareItem[]>([]);
  const slugKey = slugs.join("|");
  React.useEffect(() => {
    let cancelled = false;
    const requested = slugKey.split("|");
    if (requested.every(slug => loadedRef.current.some(item => item.slug === slug))) {
      setItems(requested.map(slug => loadedRef.current.find(item => item.slug === slug)!));
      setLoading(false);
      return;
    }
    setLoading(true); setError("");
    loadComparison(requested).then(result => { if (!cancelled) { loadedRef.current = result; setItems(result); } })
      .catch(() => { if (!cancelled) { setItems([]); setError("No pudimos actualizar los equipos. Inténtalo de nuevo."); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slugKey, retry]);
  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden"; closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const controls = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]')).filter(el => el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); if (previousFocus?.isConnected) previousFocus.focus(); };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="compare-title" aria-describedby="compare-help" className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl sm:max-h-[min(92dvh,1000px)] sm:rounded-[30px]">
        <div className="flex shrink-0 items-start justify-between gap-4 px-4 pb-3 pt-5 sm:px-7 sm:pt-6"><div><h2 id="compare-title" className="text-xl font-semibold tracking-tight sm:text-3xl">Comparar equipos</h2><p id="compare-help" className="mt-1 text-xs leading-5 text-[color:var(--foreground-soft)] sm:text-sm">Compara la configuración y el estado registrado de cada unidad.</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Cerrar comparación" className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[color:var(--border)] text-2xl">×</button></div>
        {loading ? <div role="status" className="grid min-h-64 grid-cols-3 gap-5 px-6 py-8" aria-label="Cargando los equipos seleccionados"><span className="skeleton-block h-44 rounded-xl" /><span className="skeleton-block h-44 rounded-xl" /><span className="skeleton-block h-44 rounded-xl" /><p className="col-span-3 text-center text-sm text-[color:var(--foreground-soft)]">Cargando los equipos seleccionados…</p></div>
          : error ? <div className="px-6 py-12 text-center"><p role="alert" className="text-sm">{error}</p><button type="button" onClick={() => setRetry(value => value + 1)} className="mt-4 min-h-11 rounded-full border px-5 text-sm">Reintentar</button></div>
          : items.length < 2 ? <p role="alert" className="px-6 py-12 text-center text-sm">Algunos equipos ya no están publicados. Cierra el comparador y elige otros.</p>
          : <ComparisonView items={items} onRemove={onRemove} />}
      </div>
    </div>
  );
}
