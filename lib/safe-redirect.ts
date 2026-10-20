// Devuelve una ruta interna segura para redirigir después del login.
// Se valida el resultado ya resuelto (no la cadena): el parser de URL elimina
// tabulaciones y saltos de línea, por lo que "/\t/otro.com" acabaría en otro dominio.
export function safeInternalPath(next: string, baseUrl: string, fallback = "/servmacso10/servicios") {
  const raw = String(next || "").trim();
  if (!raw.startsWith("/")) return fallback;
  try {
    const base = new URL(baseUrl);
    const resolved = new URL(raw, base);
    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
