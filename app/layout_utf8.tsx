import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Macsomenos | Catálogo",
  description: "Catálogo y tienda basada en el diseño Figma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[color:var(--color-border)]">
            <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center" aria-label="Inicio">
                  <div className="relative h-7 w-[96px] overflow-hidden">
                    <Image src="/logo.png" alt="Macsomenos" fill sizes="96px" className="object-contain" priority />
                  </div>
                </Link>
                <ul className="hidden md:flex items-center gap-6 text-[13px] tracking-wide uppercase text-[#6e6e73]">
                  <li><a href="#" className="hover:text-[#06c]">iPhone</a></li>
                  <li><a href="#" className="hover:text-[#06c]">iPad</a></li>
                  <li><a href="#" className="hover:text-[#06c]">MacBook</a></li>
                  <li><a href="#" className="hover:text-[#06c]">AirPods</a></li>
                  <li><a href="#" className="hover:text-[#06c]">Watch</a></li>
                  <li><a href="#" className="hover:text-[#06c]">Accesorios</a></li>
                  <li><a href="/contact" className="hover:text-[#06c]">Contáctanos</a></li>
                </ul>
              </div>
              <div className="flex items-center gap-4 text-[#6e6e73]">
                <button aria-label="Buscar" className="p-2 hover:text-[#1d1d1f]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2a8 8 0 105.293 14.293l3.707 3.707a1 1 0 001.414-1.414l-3.707-3.707A8 8 0 0010 2zm-6 8a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd"/></svg>
                </button>
                <Link href="/cart" aria-label="Carrito" className="p-2 hover:text-[#1d1d1f]">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.089.835l.383 1.437M7.5 14.25h9.75m-12-9l1.5 6h10.5l2.036-7.127A1.125 1.125 0 0018.72 3.75H5.118M7.5 19.5a.75.75 0 110-1.5.75.75 0 010 1.5zm9.75 0a.75.75 0 110-1.5.75.75 0 010 1.5z"/></svg>
                </Link>
              </div>
            </nav>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[color:var(--color-border)] bg-[#f5f5f7] text-sm">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid gap-8 md:grid-cols-3">
              <div>
                <div className="relative h-8 w-[120px] mb-3">
                  <Image src="/logo.png" alt="Macsomenos" fill sizes="120px" className="object-contain" />
                </div>
                <p className="text-[#6e6e73]">Tecnología al mejor precio. Macsomenos.</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Enlaces</h3>
                <ul className="space-y-1 text-[#6e6e73]">
                  <li><a href="#" className="hover:text-[#06c]">Novedades</a></li>
                  <li><a href="#" className="hover:text-[#06c]">Categorías</a></li>
                  <li><a href="/contact" className="hover:text-[#06c]">Contáctanos</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Newsletter</h3>
                <form className="flex gap-2">
                  <input className="flex-1 rounded border border-[color:var(--color-border)] px-3 py-2 text-sm" placeholder="Tu correo" />
                  <button className="bg-[#0071e3] hover:bg-[#0a84ff] transition text-white px-4 rounded">Suscribirme</button>
                </form>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
