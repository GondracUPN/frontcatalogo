"use client";

import { trackCatalogEvent } from "@/lib/analytics";
import { publicSku } from "@/lib/catalog-display";
import { formatSoles, withIgv } from "@/lib/catalog-price";

import { whatsappUrl } from "@/lib/store-config";

export { WHATSAPP_NUMBER } from "@/lib/store-config";

// Mensaje con los mismos datos que muestra la ficha: modelo, configuración,
// condición, SKU público y precio vigente. Nunca costos ni datos internos.
export function productWhatsAppMessage({ title, sku, slug, price, variant, condition }: { title: string; sku?: string; slug: string; price: number; variant?: string; condition?: string }) {
  return [
    "Hola, quisiera consultar la disponibilidad de este equipo:",
    title,
    variant ? `Configuración: ${variant}` : "",
    condition ? `Condición: ${condition}` : "",
    sku ? `SKU: ${publicSku(sku)}` : "",
    price > 0 ? `Precio mostrado: ${formatSoles(withIgv(price))} con IGV (${formatSoles(price)} sin IGV)` : "",
    `Enlace: https://www.macsomenos.com/product/${encodeURIComponent(slug)}`,
  ].filter(Boolean).join("\n");
}

export default function WhatsAppProductLink({ title, sku, slug, price, variant, condition, productId }: { title: string; sku?: string; slug: string; price: number; variant?: string; condition?: string; productId?: string }) {
  const href = whatsappUrl(productWhatsAppMessage({ title, sku, slug, price, variant, condition }));
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackCatalogEvent("click_whatsapp", { source: "product", product_slug: slug, product_id: productId })}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-emerald-300 bg-white px-5 text-sm font-semibold text-emerald-900 hover:border-emerald-500"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current text-emerald-600"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5 5 0 0 0 1 2.7 11.5 11.5 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" /></svg>
      Preguntar por WhatsApp
    </a>
  );
}
