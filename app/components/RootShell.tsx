"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
  { href: "/c/macbook", label: "MacBook" },
  { href: "/c/ipad", label: "iPad" },
  { href: "/c/iphone", label: "iPhone" },
  { href: "/c/watch", label: "Watch" },
  { href: "/c/otros", label: "Open box y usados" },
  { href: "/accesorios", label: "Accesorios" },
  { href: "/contact", label: "Contacto" },
];

export default function RootShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 px-3 py-3 sm:px-4">
        <div className="mx-auto max-w-7xl">
          <div className="surface-card soft-outline flex items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                aria-label="Abrir menu"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white/70 text-[color:var(--foreground)] md:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                  <path fillRule="evenodd" d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zm0 5.25A.75.75 0 013.75 11.25h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h11.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                </svg>
              </button>

              <Link href="/" className="group flex items-center gap-4" aria-label="Inicio">
                <div className="relative h-9 w-[112px] overflow-hidden">
                  <Image src="/logo.png" alt="Macsomenos" fill sizes="112px" className="object-contain" priority />
                </div>
                <div className="hidden lg:block">
                  <div className="text-[13px] font-semibold tracking-[0.18em] text-[color:var(--foreground)] uppercase">
                    Macsomenos
                  </div>
                </div>
              </Link>
            </div>

            <nav className="hidden items-center gap-2 xl:flex">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="btn-ghost rounded-full px-4 py-2 text-sm text-[color:var(--foreground-soft)] hover:bg-white/70 hover:text-[color:var(--foreground)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/novedades"
                className="btn-secondary hidden rounded-full border border-black/10 bg-white/75 px-4 py-2 text-sm font-medium text-[color:var(--foreground)] shadow-sm sm:inline-flex"
              >
                Ver novedades
              </Link>
              <Link
                href="/cart"
                aria-label="Carrito"
                className="btn-primary inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-[color:var(--foreground)] text-white shadow-sm hover:bg-black"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.089.835l.383 1.437M7.5 14.25h9.75m-12-9l1.5 6h10.5l2.036-7.127A1.125 1.125 0 0018.72 3.75H5.118M7.5 19.5a.75.75 0 110-1.5.75.75 0 010 1.5zm9.75 0a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            className="absolute inset-0 bg-[rgba(14,20,32,0.44)] backdrop-blur-sm"
            aria-label="Cerrar menu"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="surface-card-strong soft-outline absolute left-3 top-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] max-w-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/6 px-5 py-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
                  Navegacion
                </div>
                <div className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
                  Catalogo Macsomenos
                </div>
              </div>
              <button
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
              <div className="grid gap-3">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-[22px] border border-black/6 bg-white/70 px-4 py-4 text-[15px] font-medium text-[color:var(--foreground)] shadow-sm"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="px-3 pb-6 pt-12 sm:px-4">
        <div className="mx-auto max-w-7xl">
          <div className="surface-card soft-outline px-5 py-8 sm:px-8">
            <div className="grid gap-8 lg:grid-cols-[1.3fr_0.8fr_0.8fr]">
              <div>
                <div className="relative h-9 w-[122px] overflow-hidden">
                  <Image src="/logo.png" alt="Macsomenos" fill sizes="122px" className="object-contain" />
                </div>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[color:var(--foreground-soft)]">
                  Tecnologia premium en distintos estados.
                </p>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Explora
                </div>
                <div className="mt-4 grid gap-3 text-sm text-[color:var(--foreground)]">
                  <Link href="/novedades" className="hover:text-[color:var(--accent)]">Novedades</Link>
                  <Link href="/categorias" className="hover:text-[color:var(--accent)]">Categorias</Link>
                  <Link href="/contact" className="hover:text-[color:var(--accent)]">Contacto</Link>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Estado de equipo
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Nuevo", "Open box", "Usado premium", "Preventa"].map((item) => (
                    <span key={item} className="pill-chip !px-3 !py-2 !text-xs !font-medium !tracking-[0.08em]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
