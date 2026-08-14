"use client";

import { useState } from "react";
import { recalculateInventoryMetadata } from "../../actions";

export default function RecalculateInventoryButton() {
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState("");

  const recalculate = async () => {
    if (recalculating) return;
    setRecalculating(true);
    setMessage("");
    try {
      const result = await recalculateInventoryMetadata();
      if (!result?.ok) throw new Error(("error" in result && result.error) || "No se pudo recalcular el inventario");
      const errors = Array.isArray(result?.errores) ? result.errores.length : 0;
      setMessage(
        `Actualizados: ${Number(result?.enviados || 0)}. Omitidos: ${Number(result?.omitidosProtegidos || 0)}.${errors ? ` Errores: ${errors}.` : ""}`
      );
      window.dispatchEvent(new Event("staged-products-updated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo recalcular el inventario");
    } finally {
      setRecalculating(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={recalculate}
        disabled={recalculating}
        title="Actualiza solo equipos que siguen en inventario; no modifica publicados, vendidos ni ocultos."
        className="inline-flex items-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
      >
        {recalculating ? "Recalculando..." : "Recalcular inventario restante"}
      </button>
      {message && <span className="max-w-sm text-right text-xs font-medium text-gray-600">{message}</span>}
    </div>
  );
}
