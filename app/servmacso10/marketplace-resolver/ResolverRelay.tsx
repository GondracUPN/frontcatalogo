"use client";

import { useEffect, useState } from "react";

const facebookOrigins = ["https://www.facebook.com", "https://web.facebook.com", "https://facebook.com"];

export default function ResolverRelay() {
  const [message, setMessage] = useState("Esperando la consulta de Marketplace…");
  useEffect(() => {
    const nonce = window.location.hash.slice(1);
    const opener = window.opener;
    if (!opener || !/^[a-f0-9]{32}$/.test(nonce)) return;
    let consumed = false;
    const receive = async (event: MessageEvent) => {
      if (consumed || event.source !== opener || !facebookOrigins.includes(event.origin)
        || event.data?.type !== "MACSO_RESOLVE" || event.data?.nonce !== nonce) return;
      consumed = true;
      clearInterval(readyTimer);
      const params = new URLSearchParams();
      const query = event.data.query;
      if (query && typeof query === "object") {
        for (const key of ["listingId", "sku", "productId", "title", "price"]) {
          if (typeof query[key] === "string") params.set(key, query[key]);
        }
      }
      try {
        let response = await fetch(`/api/admin/marketplace/resolve?${params}`, { cache: "no-store" });
        let body = await response.json();
        if (response.ok && body.found && body.product?.available && params.has('listingId') && !body.linked) {
          const linked = await fetch('/api/admin/marketplace/listings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
            body: JSON.stringify({ listingId: params.get('listingId'), sku: body.product.sku, url: body.product.url,
              ...(params.has('title') ? { title: params.get('title') } : {}),
              ...(params.has('price') ? { price: params.get('price') } : {}),
            }),
          });
          if (linked.ok) body.linked = true;
          else { response = linked; body = await linked.json(); }
        }
        opener.postMessage({ type: "MACSO_RESOLVED", nonce, status: response.status, body }, event.origin);
        setMessage(response.ok ? "Enlace resuelto. Puedes cerrar esta ventana." : "La consulta no pudo identificar un producto. Revisa el chat de Marketplace.");
      } catch {
        opener.postMessage({ type: "MACSO_RESOLVED", nonce, status: 502, body: {} }, event.origin);
        setMessage("No se pudo conectar con el catálogo.");
      }
    };
    window.addEventListener("message", receive);
    const ready = () => {
      for (const origin of facebookOrigins) opener.postMessage({ type: "MACSO_RESOLVER_READY", nonce }, origin);
    };
    const readyTimer = setInterval(ready, 1000);
    const deadline = setTimeout(() => clearInterval(readyTimer), 60_000);
    ready();
    return () => { clearInterval(readyTimer); clearTimeout(deadline); window.removeEventListener("message", receive); };
  }, []);
  return <main className="mx-auto max-w-xl p-8"><h1 className="text-xl font-semibold">Resolver de Marketplace · Administrador</h1><p className="mt-4" role="status">{message}</p></main>;
}
