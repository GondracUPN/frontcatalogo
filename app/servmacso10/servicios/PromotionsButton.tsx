"use client";

import React from "react";
import { listAdminCatalog, updatePromotionAction } from "../../actions";

type Row = {
  id: string;
  product_id?: string;
  slug?: string | null;
  images?: string[];
  product?: { id?: string; title?: string; sku?: string; sale_type?: string; price?: string | number; discount?: number | string | null; final_price?: string | number | null };
  staged?: { title?: string; sku?: string; sale_type?: string; images?: string[]; notes?: string | Record<string, unknown> | null };
};

type Mode = "percent" | "amount";

function notesOf(row: Row): Record<string, any> {
  try {
    return typeof row.staged?.notes === "string" ? JSON.parse(row.staged.notes) : (row.staged?.notes as Record<string, any>) || {};
  } catch {
    return {};
  }
}

function saleTypeOf(row: Row) {
  return String(row.product?.sale_type || row.staged?.sale_type || notesOf(row).saleType || "").toUpperCase();
}

const money = (n: number) => `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// Solo presentación en promociones del administrador; nunca se usa para guardar.
const cleanMoney = (n: number) => `S/ ${Math.trunc(Number(n || 0))}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

// Mismo cálculo que el servidor (que es quien decide el precio guardado).
function finalFrom(base: number, discount: number, mode: Mode) {
  return round2(Math.max(0, mode === "amount" ? base - discount : base * (1 - discount / 100)));
}

function current(row: Row) {
  const base = Number(row.product?.price || 0);
  const discount = Number(row.product?.discount || 0);
  const mode: Mode = String(notesOf(row).discountMode || notesOf(row).discountType || "percent").toLowerCase() === "amount" ? "amount" : "percent";
  const final = row.product?.final_price ? Number(row.product.final_price) : finalFrom(base, discount, mode);
  return { base, discount, mode, final };
}

export default function PromotionsButton({ isAdmin = false }: { isAdmin?: boolean }) {
  const formatMoney = isAdmin ? cleanMoney : money;
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState("");
  const [notice, setNotice] = React.useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await listAdminCatalog();
      setRows((result.items as Row[]) || []);
    } catch {
      setError("No se pudieron cargar los productos. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  const promotions = rows.filter((row) => saleTypeOf(row) === "PROMOCION");
  const candidates = rows.filter((row) => saleTypeOf(row) !== "PROMOCION" && saleTypeOf(row) !== "PREVENTA" && Number(row.product?.price || 0) > 0);

  const applySaved = (productId: string, data: { saleType: string; discount: number | null; mode: string | null; finalPrice: number | null }) => {
    setRows((list) => list.map((row) => {
      if ((row.product?.id || row.product_id) !== productId) return row;
      const notes = { ...notesOf(row), saleType: data.saleType, discountMode: data.mode, discount: data.discount, finalPrice: data.finalPrice };
      return {
        ...row,
        product: { ...row.product, sale_type: data.saleType, discount: data.discount, final_price: data.finalPrice },
        staged: { ...row.staged, sale_type: data.saleType, notes: JSON.stringify(notes) },
      };
    }));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void load();
        }}
        className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2"
      >
        Promociones
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-2 sm:items-center sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Productos en promoción" className="flex max-h-[calc(100dvh-16px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Promociones</h2>
                <p className="text-xs text-gray-500">Cambia el descuento y el precio final se calcula solo. Los clientes lo ven en «Ofertas».</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar promociones" className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-gray-600 hover:bg-gray-100">×</button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {notice && <div role="status" className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{notice}</div>}
              {loading ? <p className="text-gray-600">Cargando promociones…</p> : error ? (
                <p className="text-red-700">{error} <button type="button" className="font-semibold underline" onClick={load}>Reintentar</button></p>
              ) : (
                <>
                  {promotions.length === 0 ? (
                    <p className="rounded-xl border border-dashed p-6 text-center text-sm text-gray-600">No hay productos en promoción. Agrega uno abajo.</p>
                  ) : (
                    <ul className="space-y-2">
                      {promotions.map((row) => (
                        <PromotionRow
                          key={row.id}
                          row={row}
                          isAdmin={isAdmin}
                          editing={editing === row.id}
                          onEdit={() => setEditing(editing === row.id ? null : row.id)}
                          onSaved={(data, message) => {
                            applySaved(String(row.product?.id || row.product_id), data);
                            setEditing(null);
                            setNotice(message);
                          }}
                        />
                      ))}
                    </ul>
                  )}

                  <section className="rounded-xl border border-gray-200 p-3">
                    <h3 className="text-sm font-semibold text-gray-900">Poner otro producto en promoción</h3>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <select value={adding} onChange={(e) => setAdding(e.target.value)} className="min-h-11 flex-1 rounded-lg border border-gray-300 px-2 text-sm">
                        <option value="">Elige un producto publicado…</option>
                        {candidates.map((row) => (
                          <option key={row.id} value={row.id}>
                            {(row.product?.title || row.staged?.title || "Producto")} · {row.product?.sku} · {formatMoney(Number(row.product?.price || 0))}
                          </option>
                        ))}
                      </select>
                    </div>
                    {adding && (() => {
                      const row = candidates.find((r) => r.id === adding);
                      return row ? (
                        <ul className="mt-2">
                          <PromotionRow
                            row={row}
                            isAdmin={isAdmin}
                            editing
                            isNew
                            onEdit={() => setAdding("")}
                            onSaved={(data, message) => {
                              applySaved(String(row.product?.id || row.product_id), data);
                              setAdding("");
                              setNotice(message);
                            }}
                          />
                        </ul>
                      ) : null;
                    })()}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PromotionRow({
  row,
  editing,
  isNew = false,
  isAdmin = false,
  onEdit,
  onSaved,
}: {
  row: Row;
  editing: boolean;
  isNew?: boolean;
  isAdmin?: boolean;
  onEdit: () => void;
  onSaved: (data: { saleType: string; discount: number | null; mode: string | null; finalPrice: number | null }, message: string) => void;
}) {
  const formatMoney = isAdmin ? cleanMoney : money;
  const title = row.product?.title || row.staged?.title || "Producto sin título";
  const sku = row.product?.sku || row.staged?.sku;
  const image = row.images?.[0] || row.staged?.images?.[0];
  const productId = String(row.product?.id || row.product_id || "");
  const now = current(row);
  const [mode, setMode] = React.useState<Mode>(isNew ? "percent" : now.mode);
  const [discountText, setDiscountText] = React.useState(isNew ? "" : String(now.discount || ""));
  const [finalText, setFinalText] = React.useState(isNew ? "" : now.final ? now.final.toFixed(2) : "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  const base = now.base;
  const discount = Number(discountText);
  const preview = Number.isFinite(discount) && discount > 0 ? finalFrom(base, discount, mode) : null;
  const invalid = !preview || preview <= 0 || (mode === "percent" && discount >= 100) || (mode === "amount" && discount >= base);

  // Escribir el descuento recalcula el precio final, y escribir el precio final
  // recalcula el descuento (en el modo elegido).
  const onDiscount = (value: string) => {
    setDiscountText(value);
    const d = Number(value);
    if (Number.isFinite(d) && d > 0) setFinalText(finalFrom(base, d, mode).toFixed(2));
  };
  const onFinal = (value: string) => {
    setFinalText(value);
    const f = Number(value);
    if (Number.isFinite(f) && f > 0 && f < base) {
      setDiscountText(String(mode === "amount" ? round2(base - f) : round2((1 - f / base) * 100)));
    }
  };
  const onMode = (next: Mode) => {
    setMode(next);
    const f = Number(finalText);
    if (Number.isFinite(f) && f > 0 && f < base) setDiscountText(String(next === "amount" ? round2(base - f) : round2((1 - f / base) * 100)));
  };

  const save = async (remove = false) => {
    if (saving) return;
    if (remove && !window.confirm(`¿Quitar la promoción de «${title}»? Volverá a su precio normal.`)) return;
    setSaving(true);
    setError("");
    const result = await updatePromotionAction(productId, remove ? { remove: true } : { discount, mode });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved(result.data, remove ? `«${title}» volvió a su precio normal.` : `«${title}» ahora cuesta ${formatMoney(result.data.finalPrice || 0)} sin IGV (${formatMoney(result.data.finalPriceWithIgv || 0)} con IGV).`);
  };

  return (
    <li className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-start gap-3">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-14 w-14 shrink-0 rounded-lg bg-gray-100 object-cover" loading="lazy" />
        ) : <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{sku}</p>
          {!isNew && (
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="text-gray-400 line-through">{formatMoney(base)}</span>
              <span className="font-semibold text-red-600">{formatMoney(now.final)}</span>
              <span className="rounded-full bg-red-50 px-1.5 text-xs font-bold text-red-700">
                {now.mode === "amount" ? `-${formatMoney(now.discount)}` : `-${isAdmin ? Math.round(now.discount) : now.discount}%`}
              </span>
              <span className="text-xs font-semibold text-emerald-700">{formatMoney(now.final * 1.18)} con IGV</span>
            </div>
          )}
          {isNew && <p className="mt-1 text-sm text-gray-700">Precio base: <strong>{formatMoney(base)}</strong> sin IGV</p>}
        </div>
        {!isNew && (
          <button type="button" onClick={onEdit} className="min-h-10 shrink-0 rounded-lg border border-gray-300 px-3 text-sm font-medium hover:bg-gray-50">
            {editing ? "Cerrar" : "Editar"}
          </button>
        )}
      </div>

      {editing && (
        <form
          className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalid) void save(false);
          }}
        >
          <div className="flex gap-2" role="radiogroup" aria-label="Tipo de descuento">
            {(["percent", "amount"] as Mode[]).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => onMode(m)} className={`min-h-10 flex-1 rounded-lg border text-sm font-medium ${mode === m ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"}`}>
                {m === "percent" ? "Porcentaje (%)" : "Monto (S/)"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs font-medium text-gray-700">Descuento {mode === "percent" ? "(%)" : "(S/)"}
              <input inputMode="decimal" value={discountText} onChange={(e) => onDiscount(e.target.value.replace(",", "."))} className="min-h-11 rounded-lg border border-gray-300 px-3 text-base" placeholder={mode === "percent" ? "Ej.: 10" : "Ej.: 200"} />
            </label>
            <label className="grid gap-1 text-xs font-medium text-gray-700">Precio final sin IGV (S/)
              <input inputMode="decimal" value={finalText} onChange={(e) => onFinal(e.target.value.replace(",", "."))} className="min-h-11 rounded-lg border border-gray-300 px-3 text-base" placeholder={base.toFixed(2)} />
            </label>
          </div>
          <div className="rounded-lg bg-white p-2 text-sm">
            {preview && !invalid ? (
              <>
                <div>El cliente verá: <span className="text-gray-400 line-through">{formatMoney(base * 1.18)}</span> → <strong className="text-emerald-700">{formatMoney(preview * 1.18)} con IGV</strong></div>
                <div className="text-xs text-gray-500">Sin IGV: {formatMoney(preview)} · ahorra {formatMoney(base - preview)}</div>
              </>
            ) : <span className="text-gray-500">Escribe un descuento o el precio final.</span>}
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving || invalid} className="min-h-11 flex-1 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
              {saving ? "Guardando…" : isNew ? "Poner en promoción" : "Guardar descuento"}
            </button>
            {!isNew && (
              <button type="button" disabled={saving} onClick={() => save(true)} className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50">
                Quitar promoción
              </button>
            )}
            {isNew && <button type="button" onClick={onEdit} className="min-h-11 rounded-lg border px-4 text-sm">Cancelar</button>}
          </div>
        </form>
      )}
    </li>
  );
}
