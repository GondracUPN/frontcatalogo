"use client";
import React from "react";
import StagedPublishModal from "./PublishModal";
import { deleteStaged } from "../../actions";

export default function StagedManager({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = React.useState<any[]>(initialItems || []);
  const [open, setOpen] = React.useState<null | any>(null);

  const costoCompra = (it: any) => {
    try {
      const notes = it?.notes && typeof it.notes === "string" ? JSON.parse(it.notes) : (it?.notes || {});
      const v = notes?.valor || notes?.specs?.valor || {};
      const c = Number(v?.costoTotal ?? v?.valorSoles ?? 0);
      if (!isFinite(c) || c <= 0) return "-";
      return `S/ ${c.toFixed(2)}`;
    } catch { return "-"; }
  };

  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-700">
            <th className="p-2">Título</th>
            <th className="p-2">SKU</th>
            <th className="p-2">Costo compra</th>
            <th className="p-2">Precio</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} className="border-t">
              <td className="p-2 text-gray-900 font-medium">{it.title}</td>
              <td className="p-2 text-gray-900">{it.sku}</td>
              <td className="p-2 text-gray-900">{costoCompra(it)}</td>
              <td className="p-2 text-gray-900">{it.price}</td>
              <td className="p-2"><span className="px-2 py-1 rounded bg-gray-100 text-gray-900">{it.status}</span></td>
              <td className="p-2 flex gap-2">
                <button onClick={() => setOpen(it)} className="px-3 py-1 rounded bg-emerald-600 text-white">Publicar</button>
                <button
                  onClick={async () => {
                    if (!confirm("¿Eliminar este borrador del inventario?")) return;
                    try {
                      await deleteStaged(it.id);
                      setItems((arr) => arr.filter((a) => a.id !== it.id));
                    } catch {
                      alert("No se pudo eliminar el borrador");
                    }
                  }}
                  className="px-3 py-1 rounded bg-red-600 text-white"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {open && (
        <StagedPublishModal
          item={open}
          onClose={() => setOpen(null)}
          onSaved={(updated) => {
            // Al publicar, mover fuera del inventario
            setItems((arr) => arr.filter((a) => a.id !== updated.id));
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
