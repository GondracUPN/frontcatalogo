"use client";

import React from "react";
import PublishModal from "./PublishModal";

type DraftItem = Record<string, unknown>;

// Para un vendedor independiente (sin acceso al inventario de Macsomenos) el
// botón se llama «Ingresar producto» y abre el formulario como venta normal.
export default function PreventaManualButton({ independent = false }: { independent?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const draft = React.useMemo<DraftItem>(() => ({
    title: independent ? "" : "Preventa",
    price: "0",
    stock: 1,
    status: "draft",
    category: "",
    images: [],
    notes: null,
    sale_type: independent ? "VENTA_SIMPLE" : "PREVENTA",
  }), [independent]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2"
      >
        {independent ? "+ Ingresar producto" : "Preventa/extra"}
      </button>

      {open && (
        <PublishModal
          item={draft}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            window.dispatchEvent(new Event("staged-products-updated"));
            window.dispatchEvent(new Event("catalog-products-updated"));
          }}
        />
      )}
    </>
  );
}
