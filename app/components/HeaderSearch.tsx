"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

type Suggestion = { slug: string; title: string; image: string; specs: string; condition: string; priceWithIgv: number };

// Buscador de la cabecera con hasta 5 sugerencias. Se puede usar con teclado
// (flechas, Enter y Escape) y sin JavaScript sigue siendo un formulario a /buscar.
export default function HeaderSearch({ className = "", inputClassName = "" }: { className?: string; inputClassName?: string }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<Suggestion[]>([]);
  const [total, setTotal] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const listId = React.useId();

  React.useEffect(() => {
    const value = query.trim();
    if (value.length < 2) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { items: [], total: 0 }))
        .then((data) => {
          setItems(Array.isArray(data?.items) ? data.items : []);
          setTotal(Number(data?.total || 0));
          setActive(-1);
        })
        .catch(() => { /* Una búsqueda cancelada o fallida no debe romper la cabecera. */ })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const showPanel = open && query.trim().length >= 2;
  const goToResults = () => {
    setOpen(false);
    router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); return; }
    if (!items.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((value) => (value + 1) % items.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => (value <= 0 ? items.length - 1 : value - 1)); }
    if (event.key === "Enter" && active >= 0 && items[active]) {
      event.preventDefault();
      setOpen(false);
      router.push(`/product/${items[active].slug}`);
    }
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form action="/buscar" role="search" onSubmit={(event) => { event.preventDefault(); if (query.trim()) goToResults(); }}>
        <label htmlFor={`${listId}-input`} className="sr-only">Buscar equipos</label>
        <input
          id={`${listId}-input`}
          name="q"
          type="search"
          autoComplete="off"
          role="combobox"
          aria-label="Buscar equipos"
          aria-expanded={showPanel}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-option-${active}` : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Buscar: MacBook Air M4, iPhone 15…"
          className={`h-11 w-full rounded-full px-4 text-sm ${inputClassName}`}
        />
      </form>
      {showPanel && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)]">
          <ul id={`${listId}-list`} role="listbox" aria-label="Sugerencias" className="max-h-[70vh] overflow-y-auto">
            {items.map((item, index) => (
              <li key={item.slug} id={`${listId}-option-${index}`} role="option" aria-selected={index === active}>
                <Link
                  href={`/product/${item.slug}`}
                  onClick={() => setOpen(false)}
                  className={`flex min-h-16 items-center gap-3 px-3 py-2 ${index === active ? "bg-blue-50" : "hover:bg-slate-50"}`}
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {item.image && <Image src={item.image} alt="" fill sizes="48px" className="object-contain" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[color:var(--foreground)]">{item.title}</span>
                    <span className="block truncate text-xs text-[color:var(--foreground-soft)]">{[item.specs, item.condition].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="shrink-0 text-right text-sm font-bold text-emerald-700">
                    S/ {item.priceWithIgv.toLocaleString("es-PE", { maximumFractionDigits: 0 })}
                    <span className="block text-[10px] font-medium text-[color:var(--foreground-soft)]">con IGV</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!loading && !items.length && (
            <p className="px-4 py-4 text-sm text-[color:var(--foreground-soft)]">No encontramos «{query.trim()}» entre los equipos disponibles. Prueba con menos palabras.</p>
          )}
          {loading && !items.length && <p className="px-4 py-4 text-sm text-[color:var(--foreground-soft)]" aria-live="polite">Buscando…</p>}
          <button type="button" onClick={goToResults} className="flex min-h-12 w-full items-center justify-center border-t border-[color:var(--border)] bg-slate-50 px-4 text-sm font-semibold text-[color:var(--accent)] hover:bg-slate-100">
            {total > items.length ? `Ver los ${total} resultados` : "Ver resultados con filtros"}
          </button>
        </div>
      )}
    </div>
  );
}
