"use client";
import React from "react";
import dynamic from "next/dynamic";
import { deleteStaged, listStaged } from "../../actions";

const StagedPublishModal = dynamic(() => import("./PublishModal"), { ssr: false });

export default function StagedManager({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = React.useState<any[]>(initialItems || []);
  const [open, setOpen] = React.useState<null | any>(null);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");

  const displaySku = (value: unknown) => String(value || "").trim().replace(/^svc(?=[-_\s]*\d)/i, "MS");
  const timeOf = (it: any) => new Date(it?.created_at || it?.updated_at || 0).getTime() || 0;

  React.useEffect(() => {
    const refreshStaged = async () => {
      try {
        const res = await listStaged({ pageSize: "all" });
        setItems(Array.isArray(res?.items) ? res.items : []);
      } catch {}
    };
    window.addEventListener("staged-products-updated", refreshStaged);
    return () => window.removeEventListener("staged-products-updated", refreshStaged);
  }, []);

  const costoCompra = (it: any) => {
    try {
      const notes = it?.notes && typeof it.notes === "string" ? JSON.parse(it.notes) : (it?.notes || {});
      const v = notes?.valor || notes?.specs?.valor || {};
      const c = Number(v?.costoTotal ?? v?.valorSoles ?? 0);
      if (!isFinite(c) || c <= 0) return "-";
      return `S/ ${c.toFixed(2)}`;
    } catch {
      return "-";
    }
  };

  const normalizeGroupTitle = (value: unknown) =>
    String(value || "Sin titulo")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}+/gu, "")
      .replace(/\s+/g, " ");

  const parseNotes = (it: any) => {
    try {
      return it?.notes && typeof it.notes === "string" ? JSON.parse(it.notes) : it?.notes || {};
    } catch {
      return {};
    }
  };

  const groupKeyFor = (it: any) => {
    const notes = parseNotes(it);
    const variantGroup = String(it?.variant_group || notes?.variantGroup || notes?.variant_group || "").trim();
    return variantGroup ? `variant:${variantGroup.toLowerCase()}` : `title:${normalizeGroupTitle(it?.title)}`;
  };

  const priceValue = (it: any) => {
    const n = Number(it?.price || 0);
    return Number.isFinite(n) ? n : 0;
  };

  const costValue = (it: any) => {
    const n = Number(costoCompra(it).replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const formatRange = (values: number[], prefix = "") => {
    const clean = values.filter((v) => Number.isFinite(v) && v > 0);
    if (!clean.length) return "-";
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    if (Math.abs(min - max) < 0.001) return `${prefix}${min.toFixed(2)}`;
    return `${prefix}${min.toFixed(2)} - ${prefix}${max.toFixed(2)}`;
  };

  const groupedItems = (() => {
    const map = new Map<string, any[]>();
    const term = search.trim().toLowerCase();
    items
      .filter((it) => !term || displaySku(it?.sku).toLowerCase().includes(term) || String(it?.title || "").toLowerCase().includes(term))
      .forEach((it) => {
      const key = groupKeyFor(it);
      map.set(key, [...(map.get(key) || []), it]);
    });
    return Array.from(map.entries())
      .map(([key, rows]) => ({ key, rows: rows.slice().sort((a, b) => timeOf(b) - timeOf(a)) }))
      .sort((a, b) => timeOf(b.rows[0]) - timeOf(a.rows[0]));
  })();

  const toggleGroup = (key: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const deleteItem = async (it: any) => {
    if (!confirm("¿Eliminar este borrador del inventario?")) return;
    try {
      await deleteStaged(it.id);
      setItems((arr) => arr.filter((a) => a.id !== it.id));
      window.dispatchEvent(new Event("staged-products-updated"));
    } catch {
      alert("No se pudo eliminar el borrador");
    }
  };

  const openForPublish = (it: any, siblings: any[]) => {
    setOpen({
      ...it,
      __mergeStock: 1,
      __mergeStagedIds: [],
      __mergeCandidates: siblings.length > 1 ? siblings.filter((row) => String(row.id) !== String(it.id)) : undefined,
    });
  };

  const renderItemRow = (it: any, nested = false, siblings: any[] = [it]) => (
    <tr key={it.id} className={`border-t ${nested ? "bg-white" : ""}`}>
      <td className={`p-2 text-gray-900 font-medium ${nested ? "pl-6" : ""}`}>{it.title}</td>
      <td className="p-2 text-gray-900">{displaySku(it.sku)}</td>
      <td className="p-2 text-gray-900">{costoCompra(it)}</td>
      <td className="p-2 text-gray-900">{it.price}</td>
      <td className="p-2"><span className="px-2 py-1 rounded bg-gray-100 text-gray-900">{it.status}</span></td>
      <td className="p-2 flex gap-2">
        <button onClick={() => openForPublish(it, siblings)} className="px-3 py-1 rounded bg-emerald-600 text-white">Publicar</button>
        <button onClick={() => deleteItem(it)} className="px-3 py-1 rounded bg-red-600 text-white">Eliminar</button>
      </td>
    </tr>
  );

  return (
    <div className="overflow-auto">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700">Buscar por SKU</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ej. MS-266"
          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
        />
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-700">
            <th className="p-2">Titulo</th>
            <th className="p-2">SKU</th>
            <th className="p-2">Costo compra</th>
            <th className="p-2">Precio</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {groupedItems.map(({ key, rows }) => {
            const first = rows[0];
            const isGrouped = rows.length > 1;
            const expanded = expandedGroups.has(key);
            if (!isGrouped) return renderItemRow(first, false, rows);

            const skus = rows.map((it) => displaySku(it.sku)).filter(Boolean);
            const statuses = Array.from(new Set(rows.map((it) => String(it.status || "").trim()).filter(Boolean))).join(", ");

            return (
              <React.Fragment key={key}>
                <tr className="border-t bg-gray-50/80">
                  <td className="p-2 text-gray-900 font-semibold">
                    {first.title}
                    <div className="mt-1 text-xs font-medium text-gray-500">{rows.length} unidades agrupadas</div>
                  </td>
                  <td className="p-2 text-gray-900">
                    {skus.length ? `${skus[0]}${skus.length > 1 ? ` +${skus.length - 1}` : ""}` : "-"}
                  </td>
                  <td className="p-2 text-gray-900">{formatRange(rows.map(costValue), "S/ ")}</td>
                  <td className="p-2 text-gray-900">{formatRange(rows.map(priceValue))}</td>
                  <td className="p-2"><span className="px-2 py-1 rounded bg-gray-100 text-gray-900">{statuses || "-"}</span></td>
                  <td className="p-2">
                    <button onClick={() => toggleGroup(key)} className="px-3 py-1 rounded bg-gray-900 text-white">
                      {expanded ? "Ocultar" : "Ver unidades"}
                    </button>
                  </td>
                </tr>
                {expanded && rows.map((it) => renderItemRow(it, true, rows))}
              </React.Fragment>
            );
          })}
          {!groupedItems.length && (
            <tr><td className="p-3 text-gray-500" colSpan={6}>No se encontraron productos.</td></tr>
          )}
        </tbody>
      </table>

      {open && (
        <StagedPublishModal
          item={open}
          onClose={() => setOpen(null)}
          onSaved={(updated) => {
            const merged = new Set([String(updated.id), ...(Array.isArray(updated.__mergeStagedIds) ? updated.__mergeStagedIds.map(String) : [])]);
            setItems((arr) => arr.filter((a) => !merged.has(String(a.id))));
            setOpen(null);
            window.dispatchEvent(new Event("staged-products-updated"));
            window.dispatchEvent(new Event("catalog-products-updated"));
          }}
        />
      )}
    </div>
  );
}
