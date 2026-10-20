"use client";

// Piezas compartidas por las composiciones de campaña: tipografía, botones y
// tarjetas de producto con datos reales (precio con IGV, precio anterior solo
// si el backend lo informa y es mayor).
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { CampaignFont, ResolvedCampaign } from "@/lib/campaigns";
import { formatSoles, withIgv } from "@/lib/catalog-price";
import { CATEGORY_LABELS } from "@/lib/catalog-display";
import { MotifGlyph } from "./motifs";

export type HeroProduct = {
  slug: string;
  title: string;
  image: string;
  category: string | null;
  condition: string;
  price: number;
  compareAt: number | null;
};

export type LayoutProps = { c: ResolvedCampaign; products: HeroProduct[]; promotions: HeroProduct[] };

export const HEADLINE: Record<CampaignFont, string> = {
  serif: "font-[family-name:var(--font-serif)] font-normal tracking-[-0.015em] leading-[0.98]",
  heavy: "font-black uppercase tracking-[-0.045em] leading-[0.88]",
  mono: "font-semibold tracking-[-0.04em] leading-[0.95]",
  sans: "font-semibold tracking-[-0.04em] leading-[0.98]",
};

/** Variables de la campaña para el bloque; el resto usa var(--c-*). */
export function vars(c: ResolvedCampaign): CSSProperties {
  const p = c.palette;
  return {
    "--c-bg": p.bg, "--c-surface": p.surface, "--c-ink": p.ink, "--c-soft": p.inkSoft,
    "--c-accent": p.accent, "--c-on-accent": p.onAccent, "--c-line": p.line,
    "--c-accent-text": c.text.accent, "--c-line-text": c.text.line,
    background: p.bg, color: p.ink,
  } as CSSProperties;
}

export function Eyebrow({ c, className = "" }: { c: ResolvedCampaign; className?: string }) {
  return (
    <p className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--c-soft)] ${c.font === "mono" ? "font-[family-name:var(--font-geist-mono)] tracking-[0.08em]" : ""} ${className}`}>
      <MotifGlyph motif={c.motif} color="var(--c-line)" className="h-4 w-4 shrink-0" />
      {c.copy.eyebrow}
    </p>
  );
}

export function Headline({ c, className = "", children }: { c: ResolvedCampaign; className?: string; children?: ReactNode }) {
  return <h1 className={`${HEADLINE[c.font]} text-balance ${className}`}>{children ?? c.copy.title}</h1>;
}

export function Lead({ c, className = "" }: { c: ResolvedCampaign; className?: string }) {
  return <p className={`text-lg leading-relaxed text-[color:var(--c-soft)] sm:text-xl ${className}`}>{c.copy.text}</p>;
}

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--c-ink)]";

/** Botón principal + secundario. El secundario lleva al catálogo o a ofertas. */
export function Ctas({ c, className = "", invert = false }: { c: ResolvedCampaign; className?: string; invert?: boolean }) {
  const secondary = c.copy.ctaUrl === "/ofertas" ? { href: "/categorias", label: "Ver catálogo" } : { href: "/ofertas", label: "Ver ofertas" };
  const primary = invert
    ? "bg-[color:var(--c-surface)] text-[color:var(--c-accent)] hover:opacity-90"
    : "bg-[color:var(--c-accent)] text-[color:var(--c-on-accent)] hover:brightness-110";
  const outline = invert ? "border-[color:var(--c-on-accent)] text-[color:var(--c-on-accent)]" : "border-[color:var(--c-ink)]/30 text-[color:var(--c-ink)]";
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <Link href={c.copy.ctaUrl} className={`inline-flex min-h-[52px] items-center rounded-full px-7 text-base font-semibold transition ${primary} ${focus}`}>
        {c.copy.cta}
      </Link>
      <Link href={secondary.href} className={`inline-flex min-h-[52px] items-center rounded-full border-2 px-6 text-base font-semibold transition hover:bg-[color:var(--c-ink)]/5 ${outline} ${focus}`}>
        {secondary.label}
      </Link>
    </div>
  );
}

export function hasDiscount(p: HeroProduct) {
  return Number(p.compareAt) > Number(p.price) && Number(p.price) > 0;
}

export function Price({ p, className = "", strikeClass = "" }: { p: HeroProduct; className?: string; strikeClass?: string }) {
  return (
    <span className={`flex flex-wrap items-baseline gap-x-2 ${className}`}>
      <span className="font-semibold">{formatSoles(withIgv(p.price))}</span>
      {hasDiscount(p) && (
        <span className={`text-[0.85em] line-through opacity-70 ${strikeClass}`}>
          <span className="sr-only">Antes </span>{formatSoles(withIgv(Number(p.compareAt)))}
        </span>
      )}
    </span>
  );
}

/** Foto del producto sobre fondo blanco (las fotos reales no tienen transparencia). */
export function ProductPhoto({ p, sizes, priority = false, className = "" }: { p: HeroProduct; sizes: string; priority?: boolean; className?: string }) {
  // Si la foto no carga, se muestra la ilustración neutra en lugar de un hueco roto.
  const [failed, setFailed] = useState(false);
  return (
    <span className={`relative block overflow-hidden bg-white ${className}`}>
      <Image src={failed || !p.image ? "/placeholder.svg" : p.image} alt={p.title} fill sizes={sizes} priority={priority} onError={() => setFailed(true)} className="object-contain p-[6%]" />
    </span>
  );
}

/** Tarjeta horizontal compacta: foto, nombre y precio. */
export function ProductChip({ p, className = "" }: { p: HeroProduct; className?: string }) {
  return (
    <Link href={`/product/${p.slug}`} className={`group flex min-w-0 items-center gap-3 rounded-2xl bg-[color:var(--c-surface)] p-2.5 pr-4 text-[color:var(--c-ink)] shadow-[0_10px_30px_rgba(0,0,0,.12)] ${focus} ${className}`}>
      <ProductPhoto p={p} sizes="72px" className="h-16 w-16 shrink-0 rounded-xl" />
      <span className="min-w-0">
        <span className="line-clamp-2 text-sm font-semibold leading-snug">{p.title}</span>
        <Price p={p} className="mt-0.5 text-sm text-[color:var(--c-soft)]" />
      </span>
    </Link>
  );
}

/** Pie de foto con el nombre y el precio del equipo principal. */
export function Caption({ p, className = "" }: { p: HeroProduct; className?: string }) {
  return (
    <Link href={`/product/${p.slug}`} className={`block ${focus} ${className}`}>
      <span className="block text-xs font-semibold uppercase tracking-[0.12em] opacity-75">{[p.category && CATEGORY_LABELS[p.category], p.condition].filter(Boolean).join(" · ")}</span>
      <span className="mt-1 line-clamp-1 block text-lg font-semibold leading-snug">{p.title}</span>
      <Price p={p} className="mt-0.5 text-base" />
    </Link>
  );
}

const FALLBACK: Record<string, string> = { iphone: "/imagenestipos/iphone.png", ipad: "/imagenestipos/ipad.png", watch: "/imagenestipos/watch.png", macbook: "/imagenestipos/mac.png" };

/** Sin productos: ilustración de la familia Apple (recurso propio) y enlace al catálogo. */
export function EmptyVisual({ c, className = "" }: { c: ResolvedCampaign; className?: string }) {
  const src = FALLBACK[c.prefer?.[0] || "iphone"] || FALLBACK.iphone;
  return (
    <Link href="/categorias" className={`relative flex flex-col items-center justify-center gap-4 rounded-[28px] bg-white p-8 text-center text-[#1d1d1f] ${focus} ${className}`}>
      <span className="relative block h-40 w-full max-w-sm"><Image src={src} alt="" fill sizes="384px" className="object-contain" /></span>
      <span className="text-base font-semibold">Mira los equipos disponibles hoy</span>
    </Link>
  );
}

/** Orden de productos para la composición: categorías preferidas primero, sin duplicados. */
export function orderProducts(c: ResolvedCampaign, list: HeroProduct[]) {
  // Sin repetir unidades ni modelos idénticos, para que la composición muestre variedad.
  const seen = new Set<string>();
  const unique = list.filter((p) => {
    const key = p.title.trim().toLowerCase();
    if (!p.image || seen.has(p.slug) || seen.has(key)) return false;
    seen.add(p.slug).add(key);
    return true;
  });
  if (!c.prefer?.length) return unique;
  const rank = (p: HeroProduct) => {
    const index = c.prefer!.indexOf(p.category || "");
    return index === -1 ? 99 : index;
  };
  return [...unique].sort((a, b) => rank(a) - rank(b));
}
