"use client";
import React from "react";
import PublishModal from "./PublishModal";

export default function AccessoryButton() {
  const [open, setOpen] = React.useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)} className="rounded bg-blue-600 px-4 py-2 text-white">+ Registrar accesorio</button>
    {open && <PublishModal item={{ category: "accesorios", sale_type: "VENTA_SIMPLE", images: [], stock: 1 }} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); window.location.reload(); }} />}
  </>;
}
