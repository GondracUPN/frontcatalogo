"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import WhatsAppLink from "./WhatsAppLink";
import { useContactVisibility } from "./useContactVisibility";

export default function ContactDock() {
  const path = usePathname();
  const visible = useContactVisibility();
  if (!visible || path.startsWith("/servmacso10") || path.startsWith("/product/") || path === "/cart" || path === "/contact") return null;
  return <nav aria-label="Contacto rápido" className="contact-dock fixed inset-x-0 bottom-0 z-40 flex items-center gap-2 border-t border-[color:var(--border)] bg-white px-4 py-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:rounded-full lg:border lg:p-1 lg:shadow-lg" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
    <Link href="/categorias" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-[color:var(--brand-tint)] px-3 text-sm font-semibold lg:hidden">Ver equipos</Link>
    <WhatsAppLink source="floating" className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#167344] px-4 text-sm font-semibold text-white hover:bg-[#105c35]">WhatsApp</WhatsAppLink>
  </nav>;
}
