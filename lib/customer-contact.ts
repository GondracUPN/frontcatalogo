/** Contacto del cliente tal como se muestra: `@usuario` de WhatsApp o solo los dígitos del celular. */
export function customerContact(value: unknown): string {
  const text = String(value ?? "").trim();
  if (text.startsWith("@")) return text;
  return text.replace(/\D+/g, "");
}
