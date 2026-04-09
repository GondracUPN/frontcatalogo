"use client";

import React from "react";
import PublishModal from "./PublishModal";

type DraftItem = Record<string, unknown>;

export default function PreventaManualButton() {
  const [open, setOpen] = React.useState(false);
  const draft = React.useMemo<DraftItem>(() => ({
    title: "Preventa",
    price: "0",
    stock: 1,
    status: "draft",
    category: "",
    images: [],
    notes: null,
    sale_type: "PREVENTA",
  }), []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2"
      >
        Preventa/extra
      </button>

      {open && (
        <PublishModal
          item={draft}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
