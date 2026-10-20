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
  description: "Equipos reales, fotos de cada unidad y precios claros. Encuentra el que mejor va contigo.",
} as const;
