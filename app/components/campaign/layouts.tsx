// Composiciones del bloque principal. Cada campaña elige una y la viste con su
// paleta, su tipografía y su motivo; las que comparten composición cambian de
// tono, letra y motivo para no parecer la misma.
"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import BrandLogo from "../BrandLogo";
import { CATEGORY_LABELS } from "@/lib/catalog-display";
import { formatSoles, withIgv } from "@/lib/catalog-price";
import { AndeanBand, GridGlow, HeartLine, Leaf, Moon, Petal, Pinstripe, Ribbon, Sparkle, SunLines } from "./motifs";
import { orderProducts, Caption, Ctas, EmptyVisual, Eyebrow, hasDiscount, Headline, Lead, Price, ProductChip, ProductPhoto, vars, type HeroProduct, type LayoutProps } from "./parts";

const wrap = "mx-auto w-full max-w-7xl px-4 sm:px-6";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--c-ink)]";
const TRUST = ["Fotos reales de cada unidad", "Precio con IGV", "Recojo gratis en Surco"];

function Trust({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap gap-x-5 gap-y-1.5 text-[15px] text-[color:var(--c-soft)] ${className}`}>
      {TRUST.map((fact) => (
        <li key={fact} className="flex items-center gap-2"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[color:var(--c-line)]" />{fact}</li>
      ))}
    </ul>
  );
}

// ---------- 1. Editorial dividida (Navidad, Día de la Madre, personalizada) ----------
export function SplitLayout({ c, products }: LayoutProps) {
  const [main, ...rest] = products;
  const dark = c.tone === "dark";
  return (
    <section style={vars(c)} className="relative overflow-hidden">
      {c.motif === "petal" && <Petal color="var(--c-line)" className="absolute -bottom-6 left-[46%] hidden h-64 w-48 opacity-70 lg:block" />}
      <div className={`${wrap} grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:py-20`}>
        <div className={c.mirror ? "lg:order-2" : ""}>
          <Eyebrow c={c} />
          <Headline c={c} className="mt-5 text-[clamp(44px,6.4vw,84px)]" />
          <Lead c={c} className="mt-5 max-w-[40ch]" />
          <Ctas c={c} className="mt-8" />
          <Trust className="mt-8" />
        </div>
        <div className={`relative ${c.mirror ? "lg:order-1" : ""}`}>
          {main ? (
            <>
              <div className={`relative overflow-hidden rounded-[32px] p-3 ${dark ? "bg-[color:var(--c-surface)] ring-1 ring-[color:var(--c-line)]/40" : "bg-[color:var(--c-surface)] shadow-[0_30px_80px_rgba(60,30,10,.12)]"}`}>
                <ProductPhoto p={main} sizes="(max-width: 1024px) 92vw, 560px" priority className="aspect-[5/4] rounded-[24px]" />
                <Caption p={main} className="px-3 pb-2 pt-4" />
                {c.motif === "ribbon" && <Ribbon color="var(--c-accent)" className="absolute -right-2 -top-2 h-36 w-36 sm:h-44 sm:w-44" />}
              </div>
              {rest.length > 0 && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {rest.slice(0, 2).map((p) => <ProductChip key={p.slug} p={p} />)}
                </div>
              )}
            </>
          ) : <EmptyVisual c={c} className="aspect-[5/4]" />}
        </div>
      </div>
    </section>
  );
}

// ---------- 2. Tipográfica de alto impacto (Año Nuevo) ----------
function campaignYear() {
  const now = new Date(Date.now() - 5 * 3600 * 1000); // hora de Lima
  return now.getUTCMonth() >= 10 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

export function TypographicLayout({ c, products }: LayoutProps) {
  const year = campaignYear();
  return (
    <section style={vars(c)} className="relative overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 top-6 select-none font-[family-name:var(--font-serif)] text-[clamp(120px,26vw,360px)] leading-none text-transparent [-webkit-text-stroke:1px_var(--c-line)] opacity-40">{year}</span>
      <div className={`${wrap} relative py-14 sm:py-20`}>
        <Eyebrow c={c} />
        <div className="mt-6 h-px w-full bg-gradient-to-r from-[color:var(--c-line)] via-[color:var(--c-line)]/40 to-transparent" />
        <Headline c={c} className="mt-8 max-w-[14ch] text-[clamp(52px,9vw,128px)]" />
        {c.motif === "gold" && (
          <span className="pointer-events-none absolute right-[8%] top-[42%] hidden gap-6 lg:flex">
            <Sparkle color="var(--c-line)" className="h-10 w-10" /><Sparkle color="var(--c-line)" className="mt-10 h-5 w-5 opacity-70" />
          </span>
        )}
        <div className="mt-10 grid items-end gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <Lead c={c} className="max-w-[42ch]" />
            <Ctas c={c} className="mt-8" />
          </div>
          {products.length > 0 && (
            <ul className="grid grid-cols-3 gap-2 sm:gap-3">
              {products.slice(0, 3).map((p, i) => (
                <li key={p.slug}>
                  <Link href={`/product/${p.slug}`} className={`block rounded-2xl border border-[color:var(--c-line)]/50 bg-[color:var(--c-surface)] p-2 ${focus}`}>
                    <ProductPhoto p={p} sizes="(max-width: 640px) 92vw, 220px" priority={i === 0} className="aspect-square rounded-xl" />
                    <span className="block px-1 pb-1 pt-2 sm:px-2 sm:pb-2 sm:pt-3">
                      <span className="line-clamp-2 text-xs font-semibold sm:line-clamp-1 sm:text-[15px]">{p.title}</span>
                      <Price p={p} className="mt-0.5 text-xs text-[color:var(--c-line-text)] sm:text-sm" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------- 3. Arco asimétrico (San Valentín) ----------
export function ArchLayout({ c, products }: LayoutProps) {
  const [main, second] = products;
  return (
    <section style={vars(c)} className="relative overflow-hidden">
      <div className={`${wrap} grid items-center gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_1fr] lg:py-20`}>
        <div>
          <Eyebrow c={c} />
          <Headline c={c} className="mt-5 text-[clamp(44px,6vw,80px)]" />
          <Lead c={c} className="mt-5 max-w-[38ch]" />
          <Ctas c={c} className="mt-8" />
          <Trust className="mt-8" />
        </div>
        <div className="relative mx-auto w-full max-w-[460px]">
          <div aria-hidden="true" className="absolute inset-0 translate-x-5 translate-y-5 rounded-t-[999px] rounded-b-[32px] bg-[color:var(--c-line)]/45" />
          {c.motif === "heart" && <HeartLine color="var(--c-accent)" className="absolute -left-10 -top-6 h-28 w-32 opacity-60" />}
          <div className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-t-[999px] rounded-b-[32px] border border-[color:var(--c-line)] bg-white p-5">
            {main ? (
              <>
                <div className="absolute inset-x-5 bottom-28 top-[18%]"><ProductPhoto p={main} sizes="(max-width: 640px) 80vw, 420px" priority className="h-full w-full" /></div>
                <Caption p={main} className="relative text-[color:#3b0d1c]" />
              </>
            ) : <EmptyVisual c={c} className="h-full" />}
          </div>
          {second && <ProductChip p={second} className="relative mt-4 sm:absolute sm:-bottom-14 sm:-right-10 sm:mt-0 sm:w-[78%]" />}
        </div>
      </div>
    </section>
  );
}

// ---------- 4. Producto central en foco (Halloween) ----------
export function SpotlightLayout({ c, products }: LayoutProps) {
  const [main, ...rest] = products;
  return (
    <section style={vars(c)} className="relative overflow-hidden">
      {c.motif === "moon" && <Moon color="var(--c-accent)" className="absolute -right-14 -top-14 h-32 w-32 opacity-40 sm:right-[6%] sm:top-8 sm:h-56 sm:w-56 sm:opacity-80" />}
      <div className={`${wrap} relative py-14 text-center sm:py-20`}>
        <Eyebrow c={c} className="justify-center" />
        <Headline c={c} className="mx-auto mt-5 max-w-[16ch] text-[clamp(44px,7vw,96px)]" />
        <Lead c={c} className="mx-auto mt-5 max-w-[44ch]" />
        <Ctas c={c} className="mt-8 justify-center" />
        <div className="relative mx-auto mt-14 grid max-w-5xl items-end gap-4 sm:grid-cols-[1fr_1.5fr_1fr]">
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-[120%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--c-accent),transparent)] opacity-40 blur-2xl" />
          {rest[0] ? <SideCard p={rest[0]} className="hidden sm:block" /> : <span className="hidden sm:block" />}
          {main ? (
            <Link href={`/product/${main.slug}`} className={`relative block rounded-[28px] bg-[color:var(--c-surface)] p-3 text-left ring-1 ring-[color:var(--c-accent)]/60 ${focus}`}>
              <ProductPhoto p={main} sizes="(max-width: 640px) 92vw, 440px" priority className="aspect-[4/3] rounded-[20px]" />
              <span className="block px-2 pb-2 pt-4">
                <span className="line-clamp-1 text-lg font-semibold">{main.title}</span>
                <Price p={main} className="mt-0.5 text-[color:var(--c-accent-text)]" strikeClass="text-[color:var(--c-soft)]" />
              </span>
            </Link>
          ) : <EmptyVisual c={c} className="relative" />}
          {rest[1] ? <SideCard p={rest[1]} className="hidden sm:block" /> : <span className="hidden sm:block" />}
        </div>
      </div>
    </section>
  );
}

function SideCard({ p, className = "" }: { p: HeroProduct; className?: string }) {
  return (
    <Link href={`/product/${p.slug}`} className={`relative block rounded-[22px] bg-[color:var(--c-surface)] p-2.5 text-left opacity-90 transition hover:opacity-100 ${focus} ${className}`}>
      <ProductPhoto p={p} sizes="240px" className="aspect-square rounded-[16px]" />
      <span className="block px-1.5 pb-1 pt-3"><span className="line-clamp-1 text-sm font-semibold">{p.title}</span><Price p={p} className="text-sm text-[color:var(--c-soft)]" /></span>
    </Link>
  );
}

// ---------- 5. Bandas (Fiestas Patrias) ----------
export function BandedLayout({ c, products }: LayoutProps) {
  const [main, ...rest] = products;
  return (
    <section style={vars(c)} className="relative overflow-hidden">
      <div className="grid lg:grid-cols-[1fr_1fr]">
        <div className="relative flex flex-col justify-center bg-[color:var(--c-accent)] px-4 pb-16 pt-12 text-[color:var(--c-on-accent)] sm:px-10 lg:min-h-[600px] lg:pl-[max(2rem,calc((100vw-80rem)/2+1.5rem))] lg:pr-12">
          <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em]">Macsomenos · {c.copy.eyebrow}</p>
          <Headline c={c} className="mt-5 text-[clamp(46px,6.6vw,96px)]" />
          <p className="mt-5 max-w-[40ch] text-lg leading-relaxed sm:text-xl">{c.copy.text}</p>
          <Ctas c={c} invert className="mt-8 [--c-surface:#ffffff]" />
          <AndeanBand color="#ffffff" className="absolute inset-x-0 bottom-0 h-6 w-full opacity-90" />
        </div>
        <div className="relative bg-white px-4 py-12 sm:px-10 lg:pr-[max(2rem,calc((100vw-80rem)/2+1.5rem))]">
          <AndeanBand color="var(--c-accent)" className="absolute inset-x-0 top-0 h-6 w-full lg:hidden" />
          {main ? (
            <div className="mx-auto flex h-full max-w-xl flex-col justify-center gap-5">
              <div className="rounded-[28px] border border-[#e8e8ea] p-3">
                <ProductPhoto p={main} sizes="(max-width: 1024px) 92vw, 520px" priority className="aspect-[4/3] rounded-[20px]" />
                <Caption p={main} className="px-2 pb-1 pt-4 text-[#1a1a1a]" />
              </div>
              {rest.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{rest.slice(0, 2).map((p) => <ProductChip key={p.slug} p={p} className="border border-[#e8e8ea] shadow-none" />)}</div>}
            </div>
          ) : <EmptyVisual c={c} className="h-full border border-[#e8e8ea]" />}
        </div>
      </div>
    </section>
  );
}

// ---------- 6. Tablero de ofertas (Black Friday) ----------
export function DealsLayout({ c, products, promotions }: LayoutProps) {
  const deals = orderProducts(c, promotions).filter(hasDiscount).slice(0, 6);
  const shown = deals.length ? deals : products.slice(0, 3);
  return (
    <section style={vars(c)} className="relative overflow-hidden">
      <div className={`${wrap} py-12 sm:py-16`}>
        <div className="grid items-end gap-8 lg:grid-cols-[1.3fr_.7fr]">
          <div>
            <Eyebrow c={c} />
            <Headline c={c} className="mt-4 text-[clamp(64px,13vw,184px)]" />
            <span aria-hidden="true" className="mt-4 block h-3 w-40 bg-[color:var(--c-accent)] sm:w-64" />
          </div>
          <div>
            <Lead c={c} />
            <Ctas c={c} className="mt-6" />
          </div>
        </div>
        {!deals.length && (
          <p className="mt-10 rounded-2xl border border-[color:var(--c-line)] px-5 py-4 text-[15px] text-[color:var(--c-soft)]">
            Aún no hay precios rebajados publicados. Mientras tanto, estos son algunos equipos disponibles hoy.
          </p>
        )}
        <ul className={`mt-8 grid gap-3 sm:gap-4 ${shown.length >= 3 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-1 sm:grid-cols-2"}`}>
          {shown.map((p, i) => {
            const savings = hasDiscount(p) ? withIgv(Number(p.compareAt)) - withIgv(p.price) : 0;
            return (
              <li key={p.slug}>
                <Link href={`/product/${p.slug}`} className={`group flex h-full flex-col rounded-[20px] bg-[color:var(--c-surface)] p-2.5 ring-1 ring-[color:var(--c-line)] hover:ring-[color:var(--c-accent)] ${focus}`}>
                  <span className="relative">
                    <ProductPhoto p={p} sizes="(max-width: 640px) 46vw, 380px" priority={i < 2} className="aspect-[4/3] rounded-[14px]" />
                    {savings > 0 && <span className="absolute left-2 top-2 rounded-md bg-[color:var(--c-accent)] px-2 py-1 text-[11px] font-black uppercase text-[color:var(--c-on-accent)] sm:text-sm">Ahorras {formatSoles(savings).replace(/\.00$/, "")}</span>}
                  </span>
                  <span className="flex flex-1 flex-col px-1.5 pb-1.5 pt-3">
                    <span className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base">{p.title}</span>
                    <Price p={p} className="mt-auto pt-2 text-lg sm:text-2xl" strikeClass="text-base text-[color:var(--c-soft)]" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ---------- 7. Mosaico (Día del Padre claro · Cyber Days digital) ----------
export function BentoLayout({ c, products }: LayoutProps) {
  const [a, b, d] = products;
  const dark = c.tone === "dark";
  const tile = `relative overflow-hidden rounded-[24px] bg-[color:var(--c-surface)] ${dark ? "ring-1 ring-[color:var(--c-line)]" : "shadow-[0_14px_40px_rgba(30,30,30,.08)]"}`;
  return (
    <section style={vars(c)} className="relative overflow-hidden">
      <div className={`${wrap} grid gap-3 py-10 sm:gap-4 sm:py-14 lg:grid-cols-4 lg:grid-rows-[minmax(250px,auto)_minmax(250px,auto)]`}>
        <div className={`${tile} flex flex-col justify-end p-7 sm:p-10 lg:col-span-2 lg:row-span-2`}>
          {c.motif === "grid" && <GridGlow color="var(--c-accent)" className="absolute inset-0 h-full w-full" />}
          {c.motif === "lines" && <Pinstripe color="var(--c-line)" className="absolute -right-8 -top-8 h-56 w-56 opacity-50" />}
          <div className="relative">
            <Eyebrow c={c} />
            <Headline c={c} className="mt-5 text-[clamp(42px,5.4vw,76px)]" />
            <Lead c={c} className="mt-5 max-w-[38ch]" />
            <Ctas c={c} className="mt-8" />
          </div>
        </div>
        {a ? (
          <Link href={`/product/${a.slug}`} className={`${tile} grid gap-4 p-3 sm:grid-cols-[1.1fr_.9fr] lg:col-span-2 ${focus}`}>
            <ProductPhoto p={a} sizes="(max-width: 1024px) 92vw, 360px" priority className="aspect-[4/3] rounded-[18px] lg:aspect-auto lg:h-full lg:min-h-[220px]" />
            <span className="flex flex-col justify-end px-2 pb-2">
              <span className={`text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--c-soft)] ${c.font === "mono" ? "font-[family-name:var(--font-geist-mono)]" : ""}`}>{a.category ? CATEGORY_LABELS[a.category] : "Destacado"}</span>
              <span className="mt-2 text-xl font-semibold leading-tight sm:text-2xl">{a.title}</span>
              <Price p={a} className="mt-2 text-lg" strikeClass="text-[color:var(--c-soft)]" />
            </span>
          </Link>
        ) : <EmptyVisual c={c} className="lg:col-span-2" />}
        {b && (
          <Link href={`/product/${b.slug}`} className={`${tile} flex flex-col p-3 ${focus}`}>
            <ProductPhoto p={b} sizes="(max-width: 1024px) 46vw, 280px" className="aspect-[4/3] rounded-[18px]" />
            <span className="px-2 pb-1 pt-3"><span className="line-clamp-1 font-semibold">{b.title}</span><Price p={b} className="text-[15px] text-[color:var(--c-soft)]" /></span>
          </Link>
        )}
        <div className={`${tile} flex flex-col justify-between gap-4 p-6 ${b ? "" : "lg:col-span-2"}`}>
          {d ? (
            <Link href={`/product/${d.slug}`} className={`flex items-center gap-3 ${focus}`}>
              <ProductPhoto p={d} sizes="96px" className="h-20 w-20 shrink-0 rounded-xl" />
              <span className="min-w-0"><span className="line-clamp-2 text-sm font-semibold">{d.title}</span><Price p={d} className="text-sm text-[color:var(--c-soft)]" /></span>
            </Link>
          ) : null}
          <ul className={`grid gap-2 text-[15px] ${c.font === "mono" ? "font-[family-name:var(--font-geist-mono)] text-sm" : ""}`}>
            {["Solicitas en línea, sin pagar en la web", "Confirmamos por WhatsApp", "Recojo gratis en Surco"].map((fact) => (
              <li key={fact} className="flex gap-2"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 bg-[color:var(--c-accent)]" />{fact}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ---------- 8. Marca protagonista (Aniversario) ----------
type ClientPhoto = { id: string; photoUrl: string; productTitle: string };

export function BrandLayout({ c, products }: LayoutProps) {
  const [clients, setClients] = React.useState<ClientPhoto[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/clientes/list")
      .then((res) => res.json())
      .then((data) => { if (!cancelled && Array.isArray(data?.items)) setClients(data.items.filter((i: ClientPhoto) => i?.photoUrl).slice(0, 2)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const tiles = [...clients.map((client) => ({ kind: "client" as const, client })), ...products.slice(0, 4 - clients.length).map((p) => ({ kind: "product" as const, p }))];
  return (
    <section style={vars(c)} className="relative overflow-hidden">
      <Leaf color="var(--c-line)" className="absolute -left-16 top-10 h-64 w-64 opacity-60" />
      <Leaf color="var(--c-line)" className="absolute -bottom-10 right-[38%] h-40 w-40 rotate-45 opacity-50" />
      <div className={`${wrap} relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[.85fr_1.15fr] lg:py-20`}>
        <div className="ms-leaf mx-auto flex aspect-square w-full max-w-[200px] flex-col items-center justify-center gap-3 bg-white p-6 shadow-[0_30px_80px_rgba(29,78,216,.14)] sm:max-w-[420px] sm:gap-4 sm:p-10">
          <BrandLogo className="h-auto w-[78%]" />
          <span className="rounded-full bg-[color:var(--c-accent)] px-3 py-1 text-xs font-semibold text-[color:var(--c-on-accent)] sm:px-4 sm:py-1.5 sm:text-sm">{c.copy.eyebrow}</span>
        </div>
        <div>
          <Headline c={c} className="text-[clamp(44px,6vw,84px)]" />
          <Lead c={c} className="mt-5 max-w-[42ch]" />
          <Ctas c={c} className="mt-8" />
          {tiles.length > 0 && (
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {tiles.map((tile) => tile.kind === "client" ? (
                <li key={`c-${tile.client.id}`} className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-white">
                  <Image src={tile.client.photoUrl} alt={`Cliente con su ${tile.client.productTitle}`} fill sizes="200px" className="object-cover" />
                </li>
              ) : (
                <li key={tile.p.slug}>
                  <Link href={`/product/${tile.p.slug}`} className={`flex aspect-[3/4] flex-col overflow-hidden rounded-2xl bg-white p-2 text-[#0f1f3d] ${focus}`}>
                    <ProductPhoto p={tile.p} sizes="200px" className="flex-1 rounded-xl" />
                    <span className="line-clamp-1 px-1 pt-2 text-xs font-semibold">{tile.p.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

// ---------- 9. Escritorio de estudio (Campaña escolar) ----------
export function DeskLayout({ c, products }: LayoutProps) {
  const cards = products.slice(0, 3);
  const tilt = ["-rotate-2", "rotate-2", "-rotate-1"];
  return (
    <section style={{ ...vars(c), backgroundImage: "repeating-linear-gradient(to bottom, transparent 0 31px, var(--c-line) 31px 32px)" }} className="relative overflow-hidden">
      <span aria-hidden="true" className="absolute inset-y-0 left-[max(12px,calc((100vw-80rem)/2))] w-px bg-[#e8a3a3]" />
      <div className={`${wrap} relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[.95fr_1.05fr] lg:py-20`}>
        <div className="rounded-[28px] bg-[color:var(--c-bg)]/90 p-1 lg:bg-transparent">
          <Eyebrow c={c} />
          <Headline c={c} className="mt-5 text-[clamp(46px,6.4vw,88px)]" />
          <Lead c={c} className="mt-5 max-w-[40ch]" />
          <Ctas c={c} className="mt-8" />
          <nav aria-label="Equipos para estudiar" className="mt-8 flex flex-wrap gap-2">
            {[["macbook", "MacBook"], ["ipad", "iPad"]].map(([key, label]) => (
              <Link key={key} href={`/c/${key}`} className={`inline-flex min-h-11 items-center rounded-lg border-2 border-[color:var(--c-ink)] bg-white px-4 text-[15px] font-semibold ${focus}`}>{label} →</Link>
            ))}
          </nav>
        </div>
        {cards.length ? (
          <ul className="relative grid grid-cols-2 gap-4 sm:gap-6">
            {cards.map((p, i) => (
              <li key={p.slug} className={`${i === 0 ? "col-span-2 mx-auto w-full max-w-md" : ""} ${tilt[i]} transition hover:rotate-0`}>
                <Link href={`/product/${p.slug}`} className={`relative block rounded-[18px] bg-white p-2.5 shadow-[0_18px_40px_rgba(16,35,58,.14)] ${focus}`}>
                  <span aria-hidden="true" className="absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 rotate-[-4deg] bg-[#fde68a]/80" />
                  <ProductPhoto p={p} sizes="(max-width: 640px) 46vw, 420px" priority={i === 0} className={`${i === 0 ? "aspect-[16/10]" : "aspect-square"} rounded-[12px]`} />
                  <span className="block px-1.5 pb-1 pt-3"><span className="line-clamp-1 text-sm font-semibold sm:text-base">{p.title}</span><Price p={p} className="text-sm text-[color:var(--c-soft)]" /></span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <EmptyVisual c={c} className="aspect-[4/3]" />}
      </div>
    </section>
  );
}

// ---------- 10. Horizonte luminoso (Verano) ----------
export function HorizonLayout({ c, products }: LayoutProps) {
  const [main, ...rest] = products;
  return (
    <section style={{ ...vars(c), background: `linear-gradient(180deg, ${c.palette.bg} 0%, #ffe9cf 100%)` }} className="relative overflow-hidden">
      <div className={`${wrap} relative grid items-center gap-10 pb-0 pt-12 sm:pt-16 lg:grid-cols-[1fr_1fr]`}>
        <div className="pb-6 lg:pb-24">
          <Eyebrow c={c} />
          <Headline c={c} className="mt-5 text-[clamp(48px,7vw,100px)]" />
          <Lead c={c} className="mt-5 max-w-[38ch]" />
          <Ctas c={c} className="mt-8" />
        </div>
        <div className="relative mx-auto w-full max-w-[520px] pb-14">
          {c.motif === "sun" && <SunLines color="#ffb347" className="absolute -top-6 right-0 h-48 w-48 sm:h-64 sm:w-64" />}
          {main ? (
            <Link href={`/product/${main.slug}`} className={`relative mx-auto block aspect-square w-[88%] overflow-hidden rounded-full bg-white shadow-[0_30px_70px_rgba(185,72,11,.18)] ${focus}`}>
              <div className="absolute inset-[12%]"><ProductPhoto p={main} sizes="(max-width: 640px) 80vw, 460px" priority className="h-full w-full" /></div>
            </Link>
          ) : <EmptyVisual c={c} className="aspect-square rounded-full" />}
          {main && (
            <div className="relative -mt-10 mx-auto w-[86%] rounded-2xl bg-white px-5 py-4 text-[#1f2a37] shadow-[0_12px_30px_rgba(0,0,0,.08)]">
              <Caption p={main} />
            </div>
          )}
          {rest[0] && <ProductChip p={rest[0]} className="mt-3 lg:absolute lg:-left-16 lg:top-10 lg:mt-0 lg:w-64" />}
        </div>
      </div>
      <svg aria-hidden="true" viewBox="0 0 1440 60" preserveAspectRatio="none" className="block h-8 w-full sm:h-12"><path d="M0 30 C240 0 480 60 720 30 C960 0 1200 60 1440 30 V60 H0 Z" fill="#ffd29a" /></svg>
    </section>
  );
}

// ---------- 11. Inmersiva con imagen propia (personalizada) ----------
export function ImmersiveLayout({ c }: LayoutProps) {
  const img = c.image;
  return (
    <section style={vars(c)} className="relative isolate overflow-hidden">
      {img && (
        <>
          <Image src={img.mobileSrc} alt="" fill priority unoptimized={!img.mobileSrc.startsWith("/")} sizes="100vw" className="-z-10 object-cover sm:hidden" style={{ objectPosition: img.position }} />
          <Image src={img.src} alt="" fill priority unoptimized={!img.src.startsWith("/")} sizes="100vw" className="-z-10 hidden object-cover sm:block" style={{ objectPosition: img.position }} />
        </>
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,.78)_0%,rgba(0,0,0,.55)_45%,rgba(0,0,0,.1)_100%)] max-sm:bg-[linear-gradient(0deg,rgba(0,0,0,.82)_0%,rgba(0,0,0,.5)_60%,rgba(0,0,0,.2)_100%)]" />
      <div className={`${wrap} flex min-h-[520px] flex-col justify-end py-12 text-white sm:min-h-[600px] sm:justify-center`} style={{ "--c-ink": "#ffffff", "--c-soft": "#e5e5e5", "--c-line": "#ffffff" } as React.CSSProperties}>
        <Eyebrow c={c} />
        <Headline c={c} className="mt-5 max-w-[16ch] text-[clamp(44px,6.4vw,88px)]" />
        <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-white/90 sm:text-xl">{c.copy.text}</p>
        <Ctas c={c} className="mt-8" />
      </div>
    </section>
  );
}

export const LAYOUT_COMPONENTS = {
  split: SplitLayout,
  typographic: TypographicLayout,
  arch: ArchLayout,
  spotlight: SpotlightLayout,
  banded: BandedLayout,
  deals: DealsLayout,
  bento: BentoLayout,
  brand: BrandLayout,
  desk: DeskLayout,
  horizon: HorizonLayout,
  immersive: ImmersiveLayout,
} as const;
