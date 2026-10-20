"use client";
import React from "react";
import Link from "next/link";
import ComparisonView from "./ComparisonView";
import type { CompareItem } from "@/lib/catalog-comparison";

export default function ComparisonPageClient({ initialItems }: { initialItems: CompareItem[] }) {
  const [items, setItems] = React.useState(initialItems);
  const remove = (slug: string) => {
    const next = items.filter(item => item.slug !== slug);
    setItems(next);
    const slugs = next.map(item => item.slug);
    try { window.localStorage.setItem("macsomenos:compare", JSON.stringify(slugs)); } catch {}
    window.history.replaceState(null, "", `/comparar?${new URLSearchParams({ items: slugs.join(",") })}`);
  };
  return <>
    {items.length ? <div className="mt-5 flex max-h-[85dvh] flex-col overflow-hidden rounded-2xl border border-[color:var(--border)] bg-white"><ComparisonView items={items} onRemove={remove} /></div> : <p className="mt-6 text-sm">Selecciona hasta tres equipos desde el catálogo.</p>}
    {items.length < 3 && <Link href="/categorias" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-[color:var(--border)] px-5 text-sm font-semibold">Agregar otro equipo</Link>}
  </>;
}
