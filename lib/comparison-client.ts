import type { CompareItem } from "./catalog-comparison";

// Comparte solo solicitudes en curso (incluido StrictMode). Cada nueva apertura
// vuelve a consultar precios y disponibilidad; no guarda resultados obsoletos.
const pending = new Map<string, Promise<CompareItem[]>>();
export function loadComparison(slugs: string[]) {
  const key = Array.from(new Set(slugs)).slice(0, 3).join(",");
  let request = pending.get(key);
  if (!request) {
    request = fetch(`/api/compare?${new URLSearchParams({ items: key })}`, { cache: "no-store", signal: AbortSignal.timeout(12000) })
      .then(async response => { if (!response.ok) throw new Error("No pudimos actualizar los equipos."); return (await response.json()).items as CompareItem[]; })
      .finally(() => pending.delete(key));
    pending.set(key, request);
  }
  return request;
}
