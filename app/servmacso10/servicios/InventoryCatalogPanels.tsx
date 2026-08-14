"use client";

import React from "react";
import CatalogManager from "./CatalogManager";
import StagedManager from "./StagedManager";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <h2 className="mb-3 text-xl font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

export default function InventoryCatalogPanels({ inventoryItems, catalogItems, sealedPresets, canDelete }: {
  inventoryItems: any[];
  catalogItems: any[];
  sealedPresets: any[];
  canDelete: boolean;
}) {
  const [search, setSearch] = React.useState("");

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <label className="block text-sm font-medium text-gray-700">Buscar por SKU o título en inventario y catálogo</label>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Ej. MS-365, MacBook Pro, M5 o 13"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Inventario">
          <StagedManager initialItems={inventoryItems} sealedPresets={sealedPresets} canDelete={canDelete} search={search} />
        </Section>
        <Section title="Catálogo">
          <CatalogManager initialItems={catalogItems} inventoryItems={inventoryItems} canDelete={canDelete} search={search} />
        </Section>
      </div>
    </div>
  );
}
