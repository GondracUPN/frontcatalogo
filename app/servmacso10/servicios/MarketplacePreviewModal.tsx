"use client";

import React from "react";
import { MarketplaceData } from "@/lib/marketplace";
import { prepareMarketplaceBridge } from "../../actions";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
  const area = document.createElement("textarea");
  area.value = value;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function allText(data: MarketplaceData) {
  return [`SKU: ${data.sku}`, "", "Título:", data.titulo, "", "Precio:", data.precio, "", "Descripción:", data.descripcion, "", "Etiquetas:", data.etiquetas.join(", ")].join("\n");
}

export default function MarketplacePreviewModal({ initialData, onClose }: { initialData: MarketplaceData; onClose: () => void }) {
  const [data, setData] = React.useState(initialData);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const update = (field: keyof MarketplaceData, value: string) => {
    setData((current) => ({ ...current, [field]: value }));
  };
  const copy = async (label: string, value: string) => {
    try {
      await copyText(value);
      setMessage(`${label} copiado`);
    } catch {
      setMessage("No se pudo copiar");
    }
  };
  const send = async () => {
    if (sending) return;
    setSending(true);
    setMessage("Guardando el producto en el backend...");
    try {
      const payload = {
        ...data,
        images: data.images.map((url) => {
          try { return new URL(url, window.location.origin).href; }
          catch { return url; }
        }),
      };
      const result = await prepareMarketplaceBridge(payload);
      if (!result.ok) throw new Error(result.message);
      setMessage("Producto enviado a Tampermonkey. Ya puedes abrir Facebook Marketplace cuando quieras.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo preparar el producto en el backend");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-labelledby="marketplace-title">
      <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 text-gray-900 shadow-2xl sm:p-6">
        <button
          onClick={onClose}
          className="sticky top-3 z-20 -mb-8 ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-2xl leading-none text-gray-500 shadow-md ring-1 ring-gray-200 hover:bg-gray-100"
          aria-label="Cerrar"
        >
          ×
        </button>
        <div className="flex items-start justify-between gap-4 pr-12">
          <div>
            <h3 id="marketplace-title" className="text-xl font-semibold">Facebook Marketplace</h3>
            <p className="mt-1 text-sm text-gray-600">SKU: <span className="font-mono font-semibold text-gray-900">{data.sku || "Sin SKU"}</span></p>
          </div>
        </div>

        <div className="mt-5 grid gap-4">
          <p className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Fotos normales listas para Marketplace: <strong>{data.images.length}</strong>. La primera será la carátula.
          </p>
          <label className="grid gap-1 text-sm font-medium">
            Título
            <input value={data.titulo} onChange={(event) => update("titulo", event.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium sm:max-w-[240px]">
            Precio
            <input value={data.precio} inputMode="numeric" onChange={(event) => update("precio", event.target.value.replace(/\D/g, ""))} className="rounded-lg border border-gray-300 px-3 py-2 font-normal" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Descripción
            <textarea value={data.descripcion} onChange={(event) => update("descripcion", event.target.value)} rows={14} className="resize-y rounded-lg border border-gray-300 px-3 py-2 font-normal leading-5" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Etiquetas
            <textarea
              value={data.etiquetas.join(", ")}
              onChange={(event) => setData((current) => ({ ...current, etiquetas: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }))}
              rows={3}
              className="resize-y rounded-lg border border-gray-300 px-3 py-2 font-normal"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => copy("Título", data.titulo)} className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white">Copiar título</button>
          <button onClick={() => copy("Precio", data.precio)} className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white">Copiar precio</button>
          <button onClick={() => copy("Descripción", data.descripcion)} className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white">Copiar descripción</button>
          <button onClick={() => copy("Etiquetas", data.etiquetas.join(", "))} className="rounded-lg bg-gray-700 px-3 py-2 text-sm text-white">Copiar etiquetas</button>
          <button onClick={() => copy("Todo", allText(data))} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">Copiar todo</button>
          <button disabled={sending} onClick={send} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60">
            {sending ? "Enviando..." : "Enviar a Marketplace"}
          </button>
        </div>
        {message && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{message}</p>}
        <p className="mt-3 text-xs text-gray-500">“Enviar” guarda los datos durante 24 horas. No abre Facebook ni publica automáticamente.</p>
      </div>
    </div>
  );
}
