"use client";

import React from "react";
import SaleClientPhoto, { type ClientPhotoUpload } from "./SaleClientPhoto";
import { updateSaleClientPhoto } from "../../actions";

type SalePhotoState = {
  id: string;
  title?: string;
  client_photo_url?: string | null;
  client_photo_public?: boolean | null;
  product_image_url?: string | null;
};

// Foto del cliente de una venta ya registrada. Permite subir una (ventas
// antiguas sin foto), reemplazarla, quitarla o dejarla solo para uso interno.
export default function SaleClientPhotoEditor({
  sale,
  onClose,
  onSaved,
}: {
  sale: SalePhotoState;
  onClose: () => void;
  onSaved: (patch: { client_photo_url: string | null; client_photo_public: boolean; product_image_url: string | null }) => void;
}) {
  const [newPhoto, setNewPhoto] = React.useState<ClientPhotoUpload | null>(null);
  const [isPublic, setIsPublic] = React.useState(sale.client_photo_public !== false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const current = sale.client_photo_url || "";

  // La foto nueva se sube recién aquí; si se cancela no se sube nada.
  const save = async (body: { clientPhotoUrl?: string; public?: boolean; remove?: boolean }) => {
    setSaving(true);
    setError("");
    try {
      if (newPhoto && !body.remove) body = { ...body, clientPhotoUrl: await newPhoto() };
      const { item } = await updateSaleClientPhoto(sale.id, body);
      onSaved({ client_photo_url: item.client_photo_url, client_photo_public: item.client_photo_public !== false, product_image_url: item.product_image_url });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la foto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Foto del cliente">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 text-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Foto del cliente</h3>
            <p className="text-sm text-slate-600">{sale.title || "Venta"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="h-10 w-10 rounded-full hover:bg-slate-100">×</button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          {current ? (
            <img src={current} alt="Foto actual del cliente" className="h-32 w-24 rounded-xl object-cover" />
          ) : (
            <div className="flex h-32 w-24 items-center justify-center rounded-xl bg-slate-100 text-center text-xs text-slate-500">Sin foto</div>
          )}
          {sale.product_image_url && <img src={sale.product_image_url} alt="Equipo vendido" className="h-20 w-20 rounded-xl bg-slate-50 object-contain" />}
          <p className="max-w-xs text-sm text-slate-600">En la portada se muestra la foto junto al equipo comprado. Nunca se publican el nombre, el teléfono ni el precio.</p>
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold">{sale.client_photo_url ? "Reemplazar la foto" : "Subir la foto"}</div>
          <p className="text-xs text-slate-500">Puedes difuminar caras u otros datos. Se sube al pulsar Guardar.</p>
          <div className="mt-2">
            <SaleClientPhoto disabled={saving} onChange={(upload) => setNewPhoto(() => upload)} />
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm">
          <input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} className="h-5 w-5" />
          <span><strong>Mostrar en la página principal</strong> (en «Equipos entregados»). Desmárcalo si el cliente no quiere aparecer.</span>
        </label>

        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex flex-wrap justify-between gap-2">
          {sale.client_photo_url ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => { if (window.confirm("¿Quitar la foto de esta venta? Dejará de mostrarse en la web.")) save({ remove: true }); }}
              className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
            >
              Quitar foto
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">Cancelar</button>
            <button
              type="button"
              disabled={saving || (!current && !newPhoto)}
              onClick={() => save({ public: isPublic })}
              className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? (newPhoto ? "Subiendo y guardando…" : "Guardando…") : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
