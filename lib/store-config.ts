import { publicSku } from "./catalog-display";

// Configuración comercial pública de Macsomenos: un único lugar para el
// número de WhatsApp y los textos de marca de la portada.

/** Número para enlaces wa.me: código de país sin «+» ni espacios. */
export const WHATSAPP_NUMBER = "51976283856";
/** Número tal como se muestra en Perú. */
export const WHATSAPP_DISPLAY = "976 283 856";
/** Formato internacional legible. */
export const WHATSAPP_INTERNATIONAL = "+51 976 283 856";

/** Enlace de WhatsApp a la tienda, opcionalmente con un mensaje inicial. */
export function whatsappUrl(text?: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/**
 * Textos de la portada. El eslogan está sujeto a revisión legal y marcaria:
 * cambiarlo aquí basta. Cada línea se muestra en su propia fila; `accent`
 * indica qué línea va en el azul de la marca.
 */
export const HERO_COPY = {
  slogan: [
    { text: "Más Apple,", accent: false },
    { text: "menos gasto.", accent: true },
  ],
  location: "Almacén en Surco, Lima",
  description: "MacBook, iPhone, iPad y más. Nuevos, open box y usados, con fotos reales y la información de cada equipo.",
} as const;

export const GENERAL_WHATSAPP_MESSAGE = "Hola, quisiera consultar por los equipos disponibles en Macsomenos.";
export type WhatsAppProduct = { title: string; sku?: string; slug: string; price: number; variant?: string; condition?: string };

export function productWhatsAppMessage({ title, sku, slug, variant, condition }: WhatsAppProduct) {
  return ["Hola, estoy interesado en este equipo:", "", title, variant ? `Configuración: ${variant}` : "", condition ? `Condición: ${condition}` : "", sku ? `SKU: ${publicSku(sku)}` : "", `https://www.macsomenos.com/product/${encodeURIComponent(slug)}`, "", "¿Sigue disponible?"].join("\n").replace(/\n{3,}/g, "\n\n");
}
