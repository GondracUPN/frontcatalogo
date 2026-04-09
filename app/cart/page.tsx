"use client";
import React from "react";
import { useRouter } from "next/navigation";
import {
  getCachedCartItems,
  listCartItems,
  persistCartItemsCache,
  removeCartItem,
  submitContactRequest,
  updateCartItem,
} from "./cartClient";

type CartRow = {
  id: string;
  qty: number;
  offer_price?: string | null;
  product?: any;
  staged?: any;
  slug?: string | null;
};

const LIMA_DISTRICTS = [
  "Ancon",
  "Ate",
  "Barranco",
  "Brena",
  "Carabayllo",
  "Chaclacayo",
  "Chorrillos",
  "Cieneguilla",
  "Comas",
  "El Agustino",
  "Independencia",
  "Jesus Maria",
  "La Molina",
  "La Victoria",
  "Lima",
  "Lince",
  "Los Olivos",
  "Lurigancho",
  "Lurin",
  "Magdalena del Mar",
  "Miraflores",
  "Pachacamac",
  "Pucusana",
  "Pueblo Libre",
  "Puente Piedra",
  "Punta Hermosa",
  "Punta Negra",
  "Rimac",
  "San Bartolo",
  "San Borja",
  "San Isidro",
  "San Juan de Lurigancho",
  "San Juan de Miraflores",
  "San Luis",
  "San Martin de Porres",
  "San Miguel",
  "Santa Anita",
  "Santa Maria del Mar",
  "Santa Rosa",
  "Santiago de Surco",
  "Surquillo",
  "Villa El Salvador",
  "Villa Maria del Triunfo",
];

const PERU_DEPARTMENTS = [
  "Amazonas",
  "Ancash",
  "Apurimac",
  "Arequipa",
  "Ayacucho",
  "Cajamarca",
  "Cusco",
  "Huancavelica",
  "Huanuco",
  "Ica",
  "Junin",
  "La Libertad",
  "Lambayeque",
  "Lima Provincia",
  "Loreto",
  "Madre de Dios",
  "Moquegua",
  "Pasco",
  "Piura",
  "Puno",
  "San Martin",
  "Tacna",
  "Tumbes",
  "Ucayali",
];

function parseNotes(notes: any) {
  try {
    return typeof notes === "string" ? JSON.parse(notes) : notes || {};
  } catch {
    return {};
  }
}

function normalizeUnit(val: any, fallbackUnit: "GB" | "TB" = "GB") {
  if (!val && val !== 0) return "";
  const s = String(val).trim();
  if (!s) return "";
  if (/\b(gb|tb)\b/i.test(s)) return s.replace(/\s+/g, " ");
  if (/^\d+(\.\d+)?$/.test(s)) return `${s} ${fallbackUnit}`;
  return s;
}

function priceFromRow(row: CartRow): number {
  const saleType = String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
  const salePrice = Number(row?.product?.price ?? row?.staged?.price ?? 0);
  if (row?.offer_price) return Number(row.offer_price);
  const notes = parseNotes(row?.staged?.notes);
  const discount = Number(row?.product?.discount ?? row?.staged?.discount ?? notes?.discount ?? notes?.descuentoPorc ?? 0);
  const finalPrice = row?.product?.final_price ?? row?.staged?.final_price ?? notes?.finalPrice ?? null;
  if (saleType === "PROMOCION") {
    const computed = finalPrice !== null ? Number(finalPrice) : +(salePrice * (1 - discount / 100)).toFixed(2);
    if (isFinite(computed) && computed > 0) return computed;
  }
  if (!saleType && typeof notes?.precioLista !== "undefined") {
    const p = Number(notes?.precioLista || 0);
    const d = Number(notes?.descuentoPorc || 0);
    const f = +(p * (1 - d / 100)).toFixed(2);
    if (isFinite(f) && f > 0) return f;
  }
  return salePrice;
}

function locationOptions(scope: "lima" | "provincia" | "") {
  if (scope === "lima") return LIMA_DISTRICTS;
  if (scope === "provincia") return PERU_DEPARTMENTS;
  return [];
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<CartRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [contactError, setContactError] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [locationScope, setLocationScope] = React.useState<"lima" | "provincia" | "">("");
  const [locationValue, setLocationValue] = React.useState("");

  const syncCache = (next: CartRow[]) => {
    setItems(next);
    persistCartItemsCache(next || []);
  };

  React.useEffect(() => {
    (async () => {
      try {
        const cached = getCachedCartItems();
        if (cached && cached.length) syncCache(cached);
        const res = await listCartItems();
        syncCache(res.items || []);
      } catch (err) {
        console.error("[cart] failed to load items", err);
      }
      setLoading(false);
    })();
  }, []);

  const subtotal = items.reduce((sum, row) => sum + priceFromRow(row) * Number(row.qty || 1), 0);
  const total = subtotal;

  const openContact = () => {
    setContactError("");
    setContactOpen(true);
  };

  const closeContact = () => {
    if (savingContact) return;
    setContactOpen(false);
  };

  const sendContact = async () => {
    const name = contactName.trim();
    const phone = contactPhone.replace(/\D+/g, "");
    if (!name) return setContactError("Ingresa tu nombre.");
    if (!phone) return setContactError("Ingresa tu numero de telefono.");
    if (!locationScope) return setContactError("Selecciona Lima o Provincia.");
    if (!locationValue) return setContactError(locationScope === "lima" ? "Selecciona un distrito." : "Selecciona un departamento.");

    setSavingContact(true);
    setContactError("");
    try {
      await submitContactRequest({ name, phone, locationScope, locationValue });
      setContactOpen(false);
      setConfirmOpen(true);
    } catch (e: any) {
      setContactError(e?.message || "No se pudo enviar tu solicitud.");
    } finally {
      setSavingContact(false);
    }
  };

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="surface-card-strong soft-outline px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="pill-chip text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
              Carrito
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-5xl">
              Tu carrito.
            </h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--foreground-soft)]">
              Resumen claro y rapido.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="surface-card soft-outline p-4 sm:p-6">
            {loading && <div className="text-sm text-[color:var(--foreground-soft)]">Cargando...</div>}
            {!loading && !items.length && <div className="text-sm text-[color:var(--foreground-soft)]">Tu carrito esta vacio.</div>}
            {items.map((row) => {
              const img = (row?.product?.images && row.product.images[0]) || row?.staged?.images?.[0] || "/placeholder.svg";
              const title = row?.product?.title || row?.staged?.title || "Producto";
              const unitPrice = priceFromRow(row);
              const condition = row?.product?.product_condition || row?.staged?.product_condition || (() => {
                const notes = parseNotes(row?.staged?.notes);
                return notes?.productCondition || notes?.estado || notes?.specs?.estado || "";
              })();
              const rawStock = Number(row?.product?.stock ?? row?.staged?.stock ?? 1);
              const maxQty = condition === "Nuevo" ? Math.max(1, rawStock || 1) : 1;
              const qtyValue = Number(row.qty || 1);
              const canIncrease = qtyValue < maxQty;
              const canNavigate = Boolean(row.slug);
              const goToProduct = () => {
                if (!row.slug) return;
                const offer = row?.offer_price ? Number(row.offer_price) : null;
                const qs = offer && isFinite(offer) ? `?offer=${encodeURIComponent(String(offer))}` : "";
                router.push(`/product/${row.slug}${qs}`);
              };
              const notes = parseNotes(row?.staged?.notes);
              const det = notes?.detalle || notes?.specs?.detalle || {};
              const ram = normalizeUnit(det?.ram, "GB");
              const storage = normalizeUnit(det?.almacenamiento, "GB");
              return (
                <div key={row.id} className="flex flex-col gap-4 border-b border-black/6 py-4 last:border-b-0 sm:flex-row sm:items-center">
                  <div
                    className={`overflow-hidden rounded-[22px] bg-[linear-gradient(145deg,#f5f7fa,#ebf0f6)] ${canNavigate ? "cursor-pointer" : ""} h-28 w-full sm:h-24 sm:w-24`}
                    onClick={goToProduct}
                  >
                    <img src={img} alt={title} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`text-base font-semibold text-[color:var(--foreground)] ${canNavigate ? "cursor-pointer hover:text-[color:var(--accent)]" : ""}`} onClick={goToProduct}>
                      {title}
                    </div>
                    <div className="mt-1 text-sm font-medium text-[color:var(--foreground)]">S/ {Number(unitPrice || 0).toFixed(2)}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {condition && <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[color:var(--foreground-soft)]">{condition}</span>}
                      {ram && <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[color:var(--foreground-soft)]">RAM {ram}</span>}
                      {storage && <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[color:var(--foreground-soft)]">SSD {storage}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      className="btn-secondary inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/82"
                      onClick={async () => {
                        const next = Math.max(1, Number(row.qty || 1) - 1);
                        await updateCartItem(row.id, next);
                        syncCache(items.map((it) => (it.id === row.id ? { ...it, qty: next } : it)));
                      }}
                    >
                      -
                    </button>
                    <span className="min-w-[32px] text-center text-sm font-medium text-[color:var(--foreground)]">{row.qty || 1}</span>
                    <button
                      disabled={!canIncrease}
                      className={`btn-secondary inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/82 ${canIncrease ? "" : "cursor-not-allowed opacity-40"}`}
                      onClick={async () => {
                        if (!canIncrease) return;
                        const next = Math.min(maxQty, Number(row.qty || 1) + 1);
                        await updateCartItem(row.id, next);
                        syncCache(items.map((it) => (it.id === row.id ? { ...it, qty: next } : it)));
                      }}
                    >
                      +
                    </button>
                    <button
                      className="btn-secondary rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600"
                      onClick={async () => {
                        await removeCartItem(row.id);
                        syncCache(items.filter((it) => it.id !== row.id));
                      }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </section>

          <aside className="surface-card soft-outline h-fit p-5 sm:p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
              Resumen
            </div>
            <div className="mt-5 space-y-3 text-sm text-[color:var(--foreground-soft)]">
              <div className="flex justify-between"><span>Subtotal</span><span className="font-medium text-[color:var(--foreground)]">S/ {subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Envio</span><span className="font-medium text-[color:var(--foreground)]">S/ 0.00</span></div>
              <div className="flex justify-between border-t border-black/6 pt-3 text-base font-semibold text-[color:var(--foreground)]"><span>Total</span><span>S/ {total.toFixed(2)}</span></div>
            </div>
            <button
              disabled={!items.length || loading}
              onClick={openContact}
              className="btn-primary mt-6 block w-full rounded-full bg-[color:var(--foreground)] py-3 text-center text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              Comprar
            </button>
          </aside>
        </div>
      </div>

      {contactOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(14,20,32,0.54)] p-4 backdrop-blur-sm">
          <div className="surface-card-strong soft-outline w-full max-w-md p-6 text-[color:var(--foreground)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">Contacto</div>
                <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Completa tu solicitud</h3>
              </div>
              <button onClick={closeContact} className="btn-secondary rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm" aria-label="Cerrar">
                Cerrar
              </button>
            </div>

            <div className="mt-5 grid gap-4">
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="px-4 py-3" placeholder="Tu nombre" />
              <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="px-4 py-3" placeholder="999999999" />
              <select
                value={locationScope}
                onChange={(e) => {
                  const next = e.target.value as "lima" | "provincia" | "";
                  setLocationScope(next);
                  setLocationValue("");
                }}
                className="px-4 py-3"
              >
                <option value="">Selecciona ubicacion</option>
                <option value="lima">Lima</option>
                <option value="provincia">Provincia</option>
              </select>

              {locationScope && (
                <select value={locationValue} onChange={(e) => setLocationValue(e.target.value)} className="px-4 py-3">
                  <option value="">{locationScope === "lima" ? "Selecciona distrito" : "Selecciona departamento"}</option>
                  {locationOptions(locationScope).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {contactError && <div className="mt-4 text-sm text-red-600">{contactError}</div>}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                disabled={savingContact}
                onClick={sendContact}
                className="btn-primary rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[color:var(--accent-strong)] disabled:opacity-50"
              >
                {savingContact ? "Enviando..." : "Enviar solicitud"}
              </button>
              <button onClick={closeContact} className="btn-secondary rounded-full border border-black/10 bg-white/82 px-6 py-3 text-sm font-medium text-[color:var(--foreground)]">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(14,20,32,0.54)] p-4 backdrop-blur-sm">
          <div className="surface-card-strong soft-outline w-full max-w-md p-6 text-[color:var(--foreground)]">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold tracking-[-0.04em]">Solicitud enviada</h3>
              <button onClick={() => setConfirmOpen(false)} className="btn-secondary rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm" aria-label="Cerrar">
                Cerrar
              </button>
            </div>
            <div className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
              Te contactaremos pronto.
            </div>
            <button onClick={() => setConfirmOpen(false)} className="btn-primary mt-5 w-full rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
