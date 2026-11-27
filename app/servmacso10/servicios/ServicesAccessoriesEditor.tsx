"use client";
import React from "react";
import { getStagedServicesAccessories, saveStagedServicesAccessories } from "../../actions";
import { formatUnitCost, groupAvailableAccessories, type ServicesAccessoryItem, type ServicesAccessoryOption } from "@/lib/services-accessories";

/**
 * Accesorios de Servicios incluidos en un equipo vinculado (SKU MS-n). Agregar o retirar guarda al momento:
 * Servicios reserva o libera la unidad y devuelve la revisión nueva. Si la ficha cambió (409) se recarga y
 * se deja revisar. Solo panel administrativo.
 */
export default function ServicesAccessoriesEditor({
  stagedId,
  onChange,
}: {
  stagedId: string;
  /** Lista vigente tras cargar o guardar (para mostrarla en «Incluye»). */
  onChange?: (accesorios: ServicesAccessoryItem[]) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [hidden, setHidden] = React.useState(false);
  const [revision, setRevision] = React.useState(0);
  const [selected, setSelected] = React.useState<ServicesAccessoryItem[]>([]);
  const [available, setAvailable] = React.useState<ServicesAccessoryOption[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ kind: "error" | "info" | "ok"; text: string } | null>(null);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  const apply = React.useCallback((items: ServicesAccessoryItem[]) => {
    setSelected(items);
    onChangeRef.current?.(items);
  }, []);

  const load = React.useCallback(async (notice?: string) => {
    setLoading(true);
    const result = await getStagedServicesAccessories(stagedId);
    if (result.ok) {
      setRevision(Number(result.data.revision) || 0);
      apply(Array.isArray(result.data.accesorios) ? result.data.accesorios : []);
      setAvailable(Array.isArray(result.data.disponibles) ? result.data.disponibles : []);
      setMessage(notice ? { kind: "info", text: notice } : null);
    } else if (result.status === 400 && /no está vinculado/i.test(result.error)) {
      setHidden(true);
    } else {
      setMessage({ kind: "error", text: result.error });
    }
    setLoading(false);
  }, [stagedId, apply]);

  React.useEffect(() => { load(); }, [load]);

  if (hidden) return null;

  const selectedIds = new Set(selected.map((item) => item.productoId));
  const options = groupAvailableAccessories(available, selectedIds);

  // Guarda la lista FINAL en Servicios (reserva/libera) y aplica la revisión devuelta.
  const persist = async (next: ServicesAccessoryItem[], okText: string) => {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveStagedServicesAccessories(stagedId, { revision, productoIds: next.map((item) => item.productoId) });
      if (result.ok) {
        setRevision(Number(result.data.revision) || 0);
        apply(Array.isArray(result.data.accesorios) ? result.data.accesorios : next);
        setMessage({ kind: "ok", text: okText });
        // Las tablas recargan la fila para que la venta y el stock usen la revisión nueva.
        window.dispatchEvent(new Event("staged-products-updated"));
        window.dispatchEvent(new Event("catalog-products-updated"));
        const refreshed = await getStagedServicesAccessories(stagedId);
        if (refreshed.ok) setAvailable(Array.isArray(refreshed.data.disponibles) ? refreshed.data.disponibles : []);
      } else if (result.status === 409) {
        await load(`${result.error || "La ficha cambió en Servicios."} Se recargaron los accesorios vigentes: revisa la lista.`);
      } else {
        setMessage({ kind: "error", text: result.error || "No se pudieron guardar los accesorios." });
      }
    } finally {
      setSaving(false);
    }
  };

  const add = (key: string) => {
    const group = options.find((candidate) => candidate.key === key);
    // De un grupo fusionado se reserva el lote más antiguo con stock.
    const option = group?.lotes[0];
    if (!group || !option) return;
    void persist(
      [...selected, { productoId: option.productoId, nombre: option.nombre, costoCompraUnitario: option.costoCompraUnitario ?? null }],
      `${option.nombre} agregado: Servicios reservó 1 unidad de ${option.codigo}.`,
    );
  };

  const remove = (item: ServicesAccessoryItem) => {
    void persist(selected.filter((other) => other.productoId !== item.productoId), `${item.nombre} retirado: la unidad vuelve al stock de Servicios.`);
  };

  return (
    <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/40 p-3" data-testid="services-accessories-editor">
      <p className="text-sm font-medium text-gray-800">Accesorios del stock de Servicios</p>
      <p className="mt-0.5 text-xs text-gray-500">Se guardan al momento: agregar reserva 1 unidad en Servicios y retirar la devuelve.</p>
      {loading ? (
        <p className="mt-2 text-sm text-gray-500">Cargando accesorios...</p>
      ) : (
        <>
          {selected.length > 0 && (
            <ul className="mt-2 space-y-1">
              {selected.map((item) => (
                <li key={item.productoId} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2 text-sm">
                  <span className="min-w-0 flex-1 py-2">
                    <span className="break-words font-medium">✓ Incluye {item.nombre}</span>
                    {formatUnitCost(item.costoCompraUnitario) && <span className="ml-2 text-xs text-gray-500">costo {formatUnitCost(item.costoCompraUnitario)}</span>}
                  </span>
                  <button type="button" disabled={saving} onClick={() => remove(item)} className="min-h-11 shrink-0 rounded border border-red-200 px-3 text-red-700 hover:bg-red-50 disabled:opacity-50">Retirar</button>
                </li>
              ))}
            </ul>
          )}
          <select
            aria-label="Agregar accesorio de Servicios"
            value=""
            disabled={saving || !options.length}
            onChange={(e) => add(e.target.value)}
            className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-60"
          >
            <option value="">{saving ? "Guardando en Servicios..." : options.length ? "Agregar accesorio disponible..." : "Sin accesorios disponibles"}</option>
            {options.map((group) => (
              <option key={group.key} value={group.key}>
                {group.nombre} · {group.codigos[0]}{group.codigos.length > 1 ? ` (+${group.codigos.length - 1} lotes)` : ""} · stock {group.disponible}{formatUnitCost(group.costoCompraUnitario) ? ` · ${formatUnitCost(group.costoCompraUnitario)}${group.codigos.length > 1 ? " prom." : ""}` : ""}
              </option>
            ))}
          </select>
        </>
      )}
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`mt-2 text-sm ${message.kind === "error" ? "text-red-700" : message.kind === "info" ? "text-amber-700" : "text-emerald-700"}`}>{message.text}</p>
      )}
    </div>
  );
}
