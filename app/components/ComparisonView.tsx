"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import { buildComparison, comparisonProduct, type CompareItem } from "@/lib/catalog-comparison";
import PriceWithIgv from "./PriceWithIgv";

/** Presentación compartida por /comparar y el modal. */
export default function ComparisonView({ items, onRemove }: { items: CompareItem[]; onRemove: (slug: string) => void }) {
  const [onlyDifferences, setOnlyDifferences] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const products = React.useMemo(() => items.map(comparisonProduct), [items]);
  const groups = React.useMemo(() => buildComparison(items, onlyDifferences), [items, onlyDifferences]);
  const columns = { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` };
  const move = (direction: number) => { const el = scrollRef.current; if (el) el.scrollBy({ left: direction * el.clientWidth * .75, behavior: "smooth" }); };
  return (
    <div className="flex min-h-0 flex-1 flex-col text-[color:var(--foreground)]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[color:var(--border)] px-4 py-3 sm:px-7">
        <button type="button" role="switch" aria-checked={onlyDifferences} onClick={() => setOnlyDifferences(value => !value)} className="inline-flex min-h-11 items-center gap-3 text-sm font-medium">
          <span aria-hidden="true" className={`flex h-6 w-10 items-center rounded-full p-0.5 transition-colors ${onlyDifferences ? "bg-[color:var(--accent)]" : "bg-slate-200"}`}><span className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${onlyDifferences ? "translate-x-4" : ""}`} /></span>Mostrar solo diferencias
        </button>
        <p className="text-xs text-[color:var(--foreground-soft)]">{items.length} equipos · Precios con IGV</p>
        <div className="flex w-full items-center justify-between sm:hidden"><span className="text-xs text-[color:var(--foreground-soft)]">Desliza para ver cada equipo</span><div className="flex gap-1"><button type="button" aria-label="Ver equipos anteriores" onClick={() => move(-1)} className="h-11 w-11 rounded-full border border-[color:var(--border)]">←</button><button type="button" aria-label="Ver equipos siguientes" onClick={() => move(1)} className="h-11 w-11 rounded-full border border-[color:var(--border)]">→</button></div></div>
      </div>
      <div ref={scrollRef} data-comparison-scroll className="min-h-0 flex-1 overflow-auto overscroll-contain" style={{ scrollbarWidth: "thin" }} tabIndex={0} role="region" aria-label="Características comparadas">
        <div className={items.length === 3 ? "min-w-[570px] sm:min-w-0" : "min-w-[360px] sm:min-w-0"}>
          <div className="grid grid-rows-[repeat(6,auto)] px-2 pt-4 sm:px-5 sm:pt-6" style={columns}>
            {products.map(product => (
              <article key={product.item.slug} className="relative row-span-6 grid grid-rows-subgrid gap-y-2 px-3 pb-5 sm:px-5">
                <button type="button" onClick={() => onRemove(product.item.slug)} aria-label={`Quitar ${product.title} de la comparación`} className="absolute right-1 top-0 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-xl text-[color:var(--foreground-soft)] hover:bg-[color:var(--surface-muted)]">×</button>
                <div className="relative h-28 sm:h-40"><Image src={product.image} alt={product.title} fill sizes="(min-width: 1024px) 260px, (min-width: 640px) 220px, 180px" className="object-contain p-2" loading="eager" /></div>
                <h3 className="break-words text-sm font-semibold leading-5 tracking-tight sm:text-lg sm:leading-6">{product.title}</h3>
                <p className="break-words text-xs leading-5 text-[color:var(--foreground-soft)] sm:text-sm">{product.summary || "Configuración no registrada"}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"><span className="font-semibold">{product.commercialLabel}</span><span className="text-[color:var(--foreground-soft)]">· {product.availabilityLabel}</span></div>
                {product.priceKnown ? <PriceWithIgv price={product.price.price} compareAt={product.price.compareAt} wrapperClassName="py-1" priceClassName="text-lg font-bold tracking-tight text-emerald-700 sm:text-2xl" /> : <p className="py-1 text-sm text-[color:var(--foreground-soft)]">Precio no registrado</p>}
                <Link href={`/product/${product.item.slug}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-[color:var(--accent-strong)] hover:underline">Ver producto <span aria-hidden="true" className="ml-1">↗</span></Link>
              </article>
            ))}
          </div>
          <div className="sticky top-0 z-20 grid border-y border-[color:var(--border)] bg-white px-2 py-2 sm:px-5" style={columns}>
            {products.map(product => <div key={product.item.slug} className="px-3 text-xs font-semibold leading-4 sm:px-5"><span className="line-clamp-2">{product.title}</span><span className="mt-0.5 block text-[10px] font-normal text-[color:var(--foreground-soft)]">{product.commercialLabel}</span></div>)}
          </div>
          <div className="px-2 pb-6 sm:px-5">
            {!groups.length && <p role="status" className="py-10 text-center text-sm text-[color:var(--foreground-soft)]">No hay diferencias registradas entre estos equipos.</p>}
            {groups.map(group => <section key={group.key} aria-labelledby={`comparison-${group.key}`} className="pt-6">
              <h3 id={`comparison-${group.key}`} className="px-3 pb-2 text-sm font-semibold tracking-tight sm:px-5">{group.label}</h3>
              {group.rows.map(row => <div key={row.key} data-comparison-row={row.key} data-different={row.different} className="border-b border-[color:var(--border)] py-3">
                <div className="mb-2 flex items-center gap-2 px-3 text-xs text-[color:var(--foreground-soft)] sm:px-5">{row.label}{row.different && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[color:var(--accent-strong)]"><span className="h-1 w-1 rounded-full bg-current" />Diferente</span>}{row.incomplete && !row.different && <span className="text-[10px]">· Datos incompletos</span>}</div>
                <div className="grid" style={columns}>{row.values.map((value, index) => <p key={items[index].slug} data-value-state={value.state} className={`break-words px-3 text-sm leading-6 sm:px-5 ${value.state !== "known" ? "text-[color:var(--foreground-soft)]" : row.different ? "font-semibold" : "font-medium"}`}><span className="sr-only">{products[index].title}: </span>{value.text}</p>)}</div>
              </div>)}
            </section>)}
          </div>
        </div>
      </div>
      <p className="shrink-0 border-t border-[color:var(--border)] px-4 py-3 text-[11px] leading-4 text-[color:var(--foreground-soft)] sm:px-7">«No registrado»: dato ausente. «No aplica»: característica que no corresponde al equipo.</p>
    </div>
  );
}
