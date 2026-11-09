"use client";
import { formatSoles, withIgv } from "@/lib/catalog-price";
import type { WhatsAppProduct } from "@/lib/store-config";
import WhatsAppProductLink from "./WhatsAppProductLink";
import { useContactVisibility } from "./useContactVisibility";

export default function MobileProductAction({ product, productId }: { product: WhatsAppProduct; productId: string }) {
  const visible = useContactVisibility("#product-action");
  if (!visible) return null;
  return <nav aria-label="Acciones de este equipo" className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--border)] bg-white px-3 py-2 shadow-lg lg:hidden" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
    <div className="mx-auto flex max-w-lg items-center gap-2">
      <div className="min-w-0 flex-1 text-[11px] leading-4 text-[color:var(--foreground-soft)]">
        <span className="block truncate font-medium">{product.title}</span>
        <span className="block">Sin IGV {formatSoles(product.price)}</span>
        <span className="block text-sm font-bold text-[color:var(--foreground)]">{formatSoles(withIgv(product.price))} <span className="text-[10px] font-normal">con IGV</span></span>
      </div>
      <WhatsAppProductLink {...product} productId={productId} source="product_mobile" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#167344] px-3 text-sm font-semibold text-white" compact />
      <a href="#product-action" aria-label="Ver opciones para agregar al carrito" className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-tint)] text-[color:var(--accent-strong)]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2"><path d="M2 3h3l3 12h10l3-9H6M9 21h.01M18 21h.01" strokeLinecap="round" /></svg></a>
    </div>
  </nav>;
}
