"use client";

import { useState } from "react";

export default function MarketplaceResolverPanel() {
  const [result, setResult] = useState<{ title: string; url: string; available: boolean; availability: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <section className="rounded-2xl border bg-white p-4">
    <h2 className="font-semibold text-gray-900">Enlace de producto para Marketplace</h2>
    <p className="mt-1 text-sm text-gray-600">Herramienta exclusiva del administrador. Busca por SKU o por título completo y precio publicado.</p>
    <a href="/api/admin/marketplace/script" download="macsomenos-chat-anuncio-v1.4.5.user.js" className="mt-3 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white">
      Descargar script de respuestas 🔗 v1.4.5
    </a>
    <form className="mt-3 flex flex-wrap items-end gap-3" onSubmit={async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const sku = String(data.get("sku") || "").trim();
      const params = new URLSearchParams(sku ? { sku } : { title: String(data.get("title") || ""), price: String(data.get("price") || "") });
      setBusy(true); setError(""); setResult(null);
      try {
        const response = await fetch(`/api/admin/marketplace/resolve?${params}`, { cache: "no-store" });
        const body = await response.json();
        if (!response.ok) throw new Error([404, 409].includes(response.status) && typeof body.message === 'string' ? body.message : "No se pudo resolver el producto.");
        setResult(body.product);
      } catch (err) { setError(err instanceof Error ? err.message : "Error al consultar"); }
      finally { setBusy(false); }
    }}>
      <label className="text-sm">SKU<input name="sku" maxLength={100} placeholder="476 o MS-476" className="mt-1 block rounded border p-2" /></label>
      <label className="text-sm">Título completo<input name="title" maxLength={300} className="mt-1 block rounded border p-2" /></label>
      <label className="text-sm">Precio Marketplace<input name="price" type="number" min="1" step="1" className="mt-1 block w-36 rounded border p-2" /></label>
      <button disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Buscando…" : "Obtener enlace"}</button>
    </form>
    <div aria-live="polite" className="mt-3 text-sm">
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {result && <><p>{result.title} · {result.availability}</p><a className="break-all text-blue-700 underline" href={result.url} target="_blank" rel="noreferrer">{result.url}</a>{!result.available && <p className="mt-1 text-red-700">Este equipo no está disponible. No enviar como oferta disponible.</p>}</>}
    </div>
  </section>;
}
