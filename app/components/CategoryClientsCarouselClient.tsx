"use client";

import Image from "next/image";
import { BrandHeading } from "./home/BrandBits";
import { categoryLabel } from "@/lib/catalog-display";
import { useEffect, useMemo, useState } from "react";

type Purchase = { id: string; photoUrl: string; productTitle: string; productImageUrl?: string | null; category?: string | null; purchasedMonth?: string | null };

// «2026-10» → «octubre de 2026», en hora de Lima y sin depender del navegador.
function monthLabel(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return "";
  return new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "America/Lima" }).format(new Date(`${value}-15T12:00:00-05:00`));
}

export default function CategoryClientsCarouselClient() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [index, setIndex] = useState(0);
  const count = purchases.length;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clientes/list", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data?.ok || !Array.isArray(data.items)) return;
        const items = data.items.filter((item: Purchase) => item?.id && item?.photoUrl && item?.productTitle);
        setPurchases(items);
        setIndex(0);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(() => {
    if (!count) return [];
    return Array.from({ length: Math.min(3, count) }, (_, offset) => purchases[(index + offset) % count]);
  }, [count, index, purchases]);

  // Sin fotos de clientes la sección no se muestra: nada de cajas vacías.
  if (!count) return null;

  return (
    <section aria-labelledby="clients-title" className="px-4 pt-14 sm:px-6 sm:pt-20">
    <div className="mx-auto max-w-7xl">
    <BrandHeading id="clients-title" title="Equipos entregados" note="Clientes de Macsomenos con el equipo que compraron." />
    <div className="relative mt-8">
      {count > 3 && <button type="button" aria-label="Anterior" onClick={() => setIndex((value) => (value - 1 + count) % count)} className="absolute -left-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[color:var(--foreground)] text-2xl text-white hover:bg-[color:var(--accent)]">‹</button>}
      <div className="flex gap-2 pb-2 sm:gap-4">
        {visible.map((purchase) => (
          <figure key={purchase.id} className="ms-store-card m-0 w-[49%] shrink-0 overflow-hidden rounded-[24px] bg-white sm:w-[32%]">
            <div className="relative aspect-[3/4] bg-[color:var(--brand-tint)]">
              <Image src={purchase.photoUrl} alt={`Cliente con su ${purchase.productTitle}`} fill sizes="(max-width: 640px) 48vw, 32vw" className="object-cover" />
              {purchase.productImageUrl && (
                <span className="ms-leaf-sm absolute bottom-3 right-3 block h-16 w-16 overflow-hidden bg-white p-1.5 shadow-md sm:h-20 sm:w-20">
                  <span className="relative block h-full w-full">
                    <Image src={purchase.productImageUrl} alt="" fill sizes="80px" className="object-contain" />
                  </span>
                </span>
              )}
            </div>
            <figcaption className="px-4 py-3">
              <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-[color:var(--foreground)]" title={purchase.productTitle}>{purchase.productTitle}</span>
              <span className="mt-0.5 block text-[13px] text-[color:var(--foreground-soft)]">
                {[purchase.category ? categoryLabel(purchase.category) : "", monthLabel(purchase.purchasedMonth)].filter(Boolean).join(" · ") || "Entregado"}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
      {count > 3 && <button type="button" aria-label="Siguiente" onClick={() => setIndex((value) => (value + 1) % count)} className="absolute -right-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-[color:var(--foreground)] text-2xl text-white hover:bg-[color:var(--accent)]">›</button>}
    </div>
    </div>
    </section>
  );
}
