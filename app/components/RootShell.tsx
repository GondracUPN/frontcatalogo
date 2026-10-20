"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getCachedCartItems } from "@/app/cart/cartClient";
import { CookiePreferencesButton } from "./CookieConsent";
import BrandLogo from "./BrandLogo";
import HeaderSearch from "./HeaderSearch";
import { WHATSAPP_DISPLAY, whatsappUrl } from "@/lib/store-config";
import { LeafMark } from "./home/BrandBits";
import { useSiteTheme } from "./theme/SiteThemeProvider";

const NAV_ITEMS = [
  { href: "/ofertas", label: "Ofertas" },
  { href: "/c/macbook", label: "MacBook" },
  { href: "/c/ipad", label: "iPad" },
  { href: "/c/iphone", label: "iPhone" },
  { href: "/c/watch", label: "Apple Watch" },
  { href: "/c/otros", label: "Otros" },
  { href: "/proximos", label: "Próximos" },
  { href: "/contact", label: "Contacto" },
];

const HELP_ITEMS = [
  { href: "/preguntas-frecuentes", label: "Preguntas frecuentes" },
  { href: "/clientes", label: "Clientes" },
];

export default function RootShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const siteTheme = useSiteTheme();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const returnFocusTo = menuTriggerRef.current;
    document.body.style.overflow = "hidden";
    menuCloseRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey); returnFocusTo?.focus(); };
  }, [menuOpen]);

  useEffect(() => {
    const updateCount = (event?: Event) => {
      const announced = (event as CustomEvent<{ count?: number }>)?.detail?.count;
      if (typeof announced === "number") return setCartCount(announced);
      setCartCount(getCachedCartItems().reduce((sum, item) => sum + Number(item?.qty || 0), 0));
    };
    updateCount();
    window.addEventListener("cart:updated", updateCount);
    return () => window.removeEventListener("cart:updated", updateCount);
  }, []);

  return (
    <div className="flex min-h-svh flex-col">
      <a href="#contenido" className="sr-only z-[80] rounded-full bg-[color:var(--foreground)] px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Saltar al contenido</a>
      <header className="sticky top-0 z-50 bg-[color:var(--background)] px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[72px] items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                ref={menuTriggerRef}
                aria-label="Abrir menú"
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-[color:var(--foreground)] xl:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zm0 5.25A.75.75 0 013.75 11.25h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </button>

              <Link href="/" className="group flex items-center gap-2.5" aria-label="Macsomenos, ir al inicio">
                <BrandLogo preset={siteTheme?.preset} className="h-10 w-10" />
                <span translate="no" className="hidden text-lg font-bold tracking-[-0.02em] text-[color:var(--foreground)] sm:inline">Macsomenos</span>
              </Link>
            </div>

            <nav aria-label="Categorías principales" className="hidden items-center gap-1 xl:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-[15px] text-[color:var(--foreground)] hover:bg-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <HeaderSearch className="hidden w-56 lg:block xl:hidden 2xl:block 2xl:w-64" />
              <Link href="/buscar" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-[15px] font-semibold text-[color:var(--foreground)] lg:hidden xl:inline-flex 2xl:hidden">
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
                <span className="max-[359px]:sr-only xl:sr-only">Buscar</span>
              </Link>
              <Link
                href="/cart"
                aria-label={cartCount > 0 ? `Carrito: ${cartCount} ${cartCount === 1 ? "producto" : "productos"}` : "Carrito"}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--foreground)] text-white transition hover:bg-black"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.089.835l.383 1.437M7.5 14.25h9.75m-12-9l1.5 6h10.5l2.036-7.127A1.125 1.125 0 0018.72 3.75H5.118M7.5 19.5a.75.75 0 110-1.5.75.75 0 010 1.5zm9.75 0a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
                {cartCount > 0 && <span aria-live="polite" aria-label={`${cartCount} ${cartCount === 1 ? "producto" : "productos"} en el carrito`} className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color:var(--accent)] px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white">{cartCount > 99 ? "99+" : cartCount}</span>}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] xl:hidden">
          <button
            className="absolute inset-0 bg-[rgba(14,20,32,0.55)]"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />
          <aside id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Menú de navegación" className="absolute left-0 top-0 h-full w-[min(24rem,100%)] overflow-y-auto overscroll-contain bg-[color:var(--background)]">
            <div className="flex items-center justify-between px-5 py-5">
              <div>
                <div className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
                  Catálogo Macsomenos
                </div>
              </div>
              <button
                ref={menuCloseRef}
                aria-label="Cerrar"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white/70"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M6.22 6.22a.75.75 0 011.06 0L12 10.94l4.72-4.72a.75.75 0 111.06 1.06L13.06 12l4.72 4.72a.75.75 0 11-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 11-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 px-5 py-5">
              <form action="/buscar" role="search"><label htmlFor="mobile-search" className="sr-only">Buscar equipos</label><input id="mobile-search" name="q" type="search" placeholder="Buscar equipos" className="min-h-11 w-full px-4" /></form>
              <div className="grid gap-3">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-14 items-center rounded-2xl bg-white px-5 text-[17px] font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)]"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {HELP_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center rounded-2xl bg-[color:var(--brand-tint)] px-4 text-[15px] font-semibold text-[color:var(--accent-strong)]">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      <main id="contenido" tabIndex={-1} className="flex-1 focus:outline-none">{children}</main>

      <footer className="mt-20 bg-white px-4 pb-10 pt-14 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <BrandLogo preset={siteTheme?.preset} className="h-10 w-10" />
                <span translate="no" className="text-lg font-semibold tracking-[-0.02em]">Macsomenos</span>
              </div>
              <p className="mt-5 flex items-center gap-2 text-[28px] font-semibold leading-tight tracking-[-0.03em]"><LeafMark className="h-6 w-6 shrink-0" />Más Apple, menos gasto.</p>
              <p className="mt-3 max-w-[46ch] text-[15px] leading-relaxed text-[color:var(--foreground-soft)]">
                Equipos Apple nuevos, open box y usados en Perú. Revisa cada unidad, envía tu solicitud sin pago y coordinamos contigo por WhatsApp.
              </p>
              <p className="mt-4 text-[15px] leading-relaxed text-[color:var(--foreground)]">
                Almacén: Jr. Ganimedes 245, Surco, Lima<br />
                WhatsApp: <a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--accent)] hover:underline">{WHATSAPP_DISPLAY}</a>
              </p>
            </div>
            <nav aria-label="Comprar">
              <h2 className="text-[15px] font-semibold">Comprar</h2>
              <ul className="mt-2 text-[15px] text-[color:var(--foreground-soft)]">
                <li><Link href="/c/macbook" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">MacBook</Link></li>
                <li><Link href="/c/iphone" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">iPhone</Link></li>
                <li><Link href="/c/ipad" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">iPad</Link></li>
                <li><Link href="/c/watch" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">Apple Watch</Link></li>
                <li><Link href="/ofertas" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">Ofertas</Link></li>
                <li><Link href="/novedades" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">Novedades</Link></li>
              </ul>
            </nav>
            <nav aria-label="Ayuda">
              <h2 className="text-[15px] font-semibold">Ayuda</h2>
              <ul className="mt-2 text-[15px] text-[color:var(--foreground-soft)]">
                <li><Link href="/preguntas-frecuentes" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">Preguntas frecuentes</Link></li>
                <li><Link href="/clientes" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">Clientes y entregas</Link></li>
                <li><a href={whatsappUrl()} target="_blank" rel="noopener noreferrer" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">WhatsApp</a></li>
                <li><Link href="/contact" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">Contacto</Link></li>
                <li><Link href="/proximos" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">Próximos ingresos</Link></li>
                <li><Link href="/cookies" className="flex min-h-10 items-center hover:text-[color:var(--foreground)] hover:underline">Política de cookies</Link></li>
                <li><CookiePreferencesButton className="flex min-h-10 items-center text-left hover:text-[color:var(--foreground)] hover:underline" /></li>
              </ul>
            </nav>
          </div>
          <p className="mt-12 border-t border-[#e8e8ed] pt-6 text-[13px] text-[color:var(--foreground-soft)]">Macsomenos · Equipos Apple en Perú. Apple, MacBook, iPhone, iPad y Apple Watch son marcas de Apple Inc.</p>
        </div>
      </footer>
    </div>
  );
}
