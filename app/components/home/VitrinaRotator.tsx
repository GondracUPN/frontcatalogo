"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { badgeTone, productBadges } from "@/lib/catalog-display";
import { formatSoles, withIgv } from "@/lib/catalog-price";
import type { VitrinaUnit } from "./HeroVitrina";

// Vitrina de la portada: muestra 3 unidades de las más recientes y avanza de
// una en una (entra una, se quedan dos), en ciclo. Se pausa al pasar el mouse o
// enfocar, con la pestaña oculta y con «reducir movimiento».

const VISIBLE = 3;
const INTERVAL_MS = 5000;

function UnitTag({ unit, large = false }: { unit: VitrinaUnit; large?: boolean }) {
  const discounted = Boolean(unit.compareAt && unit.compareAt > unit.price);
  const discountPct = discounted ? Math.round((1 - unit.price / Number(unit.compareAt)) * 100) : 0;
  // Preventa y condición; la oferta se indica en el precio, solo si hay descuento real.
  const badges = productBadges({ condition: unit.condition, saleType: unit.saleType }, 2).filter((badge) => badge.kind === "preorder" || badge.kind === "condition");
  return (
    <span className={`ms-tag block bg-white/95 text-left shadow-[0_8px_24px_rgba(15,23,42,0.14)] backdrop-blur-sm transition-transform duration-300 group-hover:-translate-y-0.5 motion-reduce:transition-none ${large ? "px-4 py-3 sm:px-5 sm:py-3.5" : "px-3 py-2.5"}`}>
      {badges.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {badges.map((badge) => (
            <span key={badge.kind} className={`rounded-full px-2 py-0.5 font-semibold ${large ? "text-[12px]" : "text-[11px]"} ${badgeTone(badge)}`}>{badge.label}</span>
          ))}
        </span>
      )}
      <span className={`mt-1.5 line-clamp-2 font-semibold leading-tight tracking-[-0.01em] text-[color:var(--foreground)] ${large ? "text-[17px] sm:text-[19px]" : "text-[14px]"}`}>{unit.title}</span>
      {unit.detail && large && <span className={`mt-0.5 block truncate text-[color:var(--foreground-soft)] ${large ? "text-[13px] sm:text-sm" : "text-[12px]"}`}>{unit.detail}</span>}
      <span className={`mt-1.5 flex flex-wrap items-baseline gap-x-2 ${large ? "" : "text-[14px]"}`}>
        <span className={`font-bold tabular-nums text-[color:var(--foreground)] ${large ? "text-lg sm:text-xl" : ""}`}>{formatSoles(withIgv(unit.price))}</span>
        <span className="text-[11px] font-medium text-[color:var(--foreground-soft)]">con IGV</span>
        {discounted && large && (
          <>
            <span className="text-sm text-[color:var(--foreground-soft)] line-through">{formatSoles(withIgv(Number(unit.compareAt)))}</span>
            {discountPct > 0 && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-bold text-red-700">-{discountPct}%</span>}
          </>
        )}
      </span>
    </span>
  );
}

function Tile({ unit, main = false, tall = false, priority = false, animate = false }: { unit: VitrinaUnit; main?: boolean; tall?: boolean; priority?: boolean; animate?: boolean }) {
  return (
    <Link
      href={`/product/${unit.slug}`}
      aria-label={`${unit.title} · ${unit.condition} · ${formatSoles(withIgv(unit.price))} con IGV`}
      className={`group relative block overflow-hidden bg-[color:var(--surface-muted)] outline-none focus-visible:ring-4 focus-visible:ring-[color:var(--accent-soft)] ${animate ? "product-photo-enter" : ""} ${main ? "col-span-2 row-span-2 rounded-[22px] sm:rounded-[28px]" : `${tall ? "row-span-2 " : ""}rounded-[18px] sm:rounded-[22px]`}`}
    >
      <Image
        src={unit.image}
        alt=""
        fill
        priority={priority}
        sizes={main ? "(min-width: 1024px) 460px, 64vw" : "(min-width: 1024px) 230px, 32vw"}
        className="object-cover transition duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
      />
      <span className={`absolute ${main ? "inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 sm:right-auto sm:max-w-[min(100%-2rem,340px)]" : "inset-x-2.5 bottom-2.5 hidden xl:block"}`}>
        <UnitTag unit={unit} large={main} />
      </span>
    </Link>
  );
}

export default function VitrinaRotator({ units }: { units: VitrinaUnit[] }) {
  const [offset, setOffset] = useState(0);
  const [paused, setPaused] = useState(false);
  const rotates = units.length > VISIBLE;

  useEffect(() => {
    if (!rotates || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setOffset((current) => (current + 1) % units.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [rotates, paused, units.length]);

  const shown = rotates ? Array.from({ length: VISIBLE }, (_, i) => units[(offset + i) % units.length]) : units.slice(0, VISIBLE);
  const [main, ...rest] = shown;
  if (!main) return null;
  // Las imágenes cambian solo después de la primera rotación: la carga inicial no se anima.
  const animate = offset > 0;
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={`grid gap-2.5 sm:gap-3.5 ${rest.length ? "aspect-[3/2] grid-cols-3 grid-rows-2" : "aspect-[4/3] grid-cols-2 grid-rows-2"}`}
    >
      <Tile key={`main-${main.slug}`} unit={main} main priority={offset === 0} animate={animate} />
      {rest.map((unit) => <Tile key={unit.slug} unit={unit} tall={rest.length === 1} animate={animate} />)}
    </div>
  );
}
