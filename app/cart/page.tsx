"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PriceWithIgv from "@/app/components/PriceWithIgv";
import { catalogFacts } from "@/lib/catalog-display";
import {
  clearCartItemsCache,
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

const LIMA_CALLAO_DISTRICTS = [
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
  "Bellavista",
  "Callao",
  "Carmen de la Legua Reynoso",
  "La Perla",
  "La Punta",
  "Mi Peru",
  "Ventanilla",
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
    const mode = String(notes?.discountMode || notes?.discountType || "percent").toLowerCase();
    const computed = finalPrice !== null ? Number(finalPrice) : +(mode === "amount" ? Math.max(0, salePrice - discount) : salePrice * (1 - discount / 100)).toFixed(2);
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

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<CartRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [contactOpen, setContactOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [savingContact, setSavingContact] = React.useState(false);
  const [contactError, setContactError] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [loadError, setLoadError] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [locationScope, setLocationScope] = React.useState<"almacen" | "punto_medio" | "">("");
  const [locationValue, setLocationValue] = React.useState("");
  const closeContactRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!contactOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeContactRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !savingContact) setContactOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKey); };
  }, [contactOpen, savingContact]);

  const syncCache = React.useCallback((next: CartRow[]) => {
    setItems(next);
    persistCartItemsCache(next || []);
  }, []);

  const loadCart = React.useCallback(async () => {
      setLoadError("");
      setLoading(true);
      try {
        const cached = getCachedCartItems();
        if (cached && cached.length) {
          syncCache(cached);
          setLoading(false);
        }
        const res = await listCartItems();
        syncCache(res.items || []);
      } catch (err) {
        console.error("[cart] failed to load items", err);
        setLoadError("No pudimos actualizar el carrito.");
      }
      setLoading(false);
  }, [syncCache]);

  React.useEffect(() => {
    loadCart();
  }, [loadCart]);

  const subtotal = items.reduce((sum, row) => sum + priceFromRow(row) * Number(row.qty || 1), 0);
  const totalWithIgv = subtotal * 1.18;

  const openContact = () => {
    setContactError("");
    setFieldErrors({});
    setContactOpen(true);
  };

  const closeContact = () => {
    if (savingContact) return;
    setContactOpen(false);
  };

  const sendContact = async () => {
    const name = contactName.trim();
    const phone = contactPhone.replace(/\D+/g, "");
    const errors: Record<string, string> = {};
    if (name.length < 2) errors.name = "Ingresa tu nombre completo.";
    if (!/^9\d{8}$/.test(phone)) errors.phone = "Ingresa un número peruano de 9 dígitos que comience con 9.";
    if (!locationScope) errors.location = "Selecciona una opción de entrega.";
    if (locationScope === "punto_medio" && !locationValue.trim()) errors.district = "Selecciona tu distrito.";
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setSavingContact(true);
    setContactError("");
    try {
      await submitContactRequest({
        name,
        phone,
        locationScope: locationScope as "almacen" | "punto_medio",
        locationValue: locationScope === "almacen" ? "Recoger en almacen" : locationValue.trim(),
      });
      clearCartItemsCache();
      setItems([]);
      setContactName("");
      setContactPhone("");
      setLocationScope("");
      setLocationValue("");
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
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="surface-card soft-outline p-4 sm:p-6">
            {loadError && <div role="alert" className="mb-4 rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}<button type="button" onClick={loadCart} className="ml-3 min-h-11 rounded-full border border-red-300 bg-white px-4 py-2 font-semibold">Reintentar</button></div>}
            {loading && !items.length && (
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-4 border-b border-black/6 py-4 last:border-b-0 sm:flex-row sm:items-center">
                    <div className="h-28 w-full rounded-[22px] bg-[linear-gradient(100deg,#eef2f6_0%,#f8fafc_45%,#eef2f6_90%)] bg-[length:220%_100%] sm:h-24 sm:w-24" />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="h-5 w-3/4 rounded-full bg-slate-200/80" />
                      <div className="h-4 w-28 rounded-full bg-slate-100" />
                      <div className="flex gap-2">
                        <div className="h-7 w-20 rounded-full bg-slate-100" />
                        <div className="h-7 w-24 rounded-full bg-slate-100" />
                      </div>
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <div className="h-9 w-9 rounded-full bg-slate-100" />
                      <div className="h-9 w-9 rounded-full bg-slate-100" />
                      <div className="h-9 w-24 rounded-full bg-red-50" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && !items.length && (
              <div className="py-8 text-center">
                <h2 className="text-2xl font-semibold text-[color:var(--foreground)]">Tu carrito está vacío.</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[color:var(--foreground-soft)]">Descubre los equipos recién publicados o explora por categoría.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link href="/novedades" className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm font-semibold text-white">Ver últimas llegadas</Link>
                  <Link href="/categorias" className="inline-flex min-h-11 items-center rounded-full border border-black/10 bg-white px-5 py-2 text-sm font-semibold text-[color:var(--foreground)]">Explorar categorías</Link>
                </div>
              </div>
            )}
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
              const facts = catalogFacts(row);
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
                    <PriceWithIgv price={unitPrice} wrapperClassName="mt-1" priceClassName="text-sm font-semibold text-[color:var(--foreground)]" labelClassName="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--foreground-soft)]" igvClassName="mt-0.5 text-xs text-[color:var(--foreground-soft)]" />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {condition && <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[color:var(--foreground-soft)]">{condition}</span>}
                      {ram && <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[color:var(--foreground-soft)]">RAM {ram}</span>}
                      {storage && <span className="rounded-full bg-white/80 px-3 py-1 text-xs text-[color:var(--foreground-soft)]">SSD {storage}</span>}
                    </div>
                    {facts.hasConditionDetails && <div className="mt-2 text-xs font-semibold text-amber-800">Este producto tiene un detalle estético revisado.</div>}
                    {canNavigate && <button type="button" onClick={goToProduct} className="mt-2 min-h-11 text-sm font-semibold text-[color:var(--accent)] underline-offset-4 hover:underline">Volver a la ficha</button>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      aria-label={`Reducir cantidad de ${title}`}
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
                      type="button"
                      aria-label={canIncrease ? `Aumentar cantidad de ${title}` : "No se puede aumentar: solo hay una unidad disponible"}
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
                    {!canIncrease && <span className="basis-full text-xs text-[color:var(--foreground-soft)] sm:max-w-40">Solo hay una unidad disponible.</span>}
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
            {loading && !items.length ? (
              <div className="mt-5 space-y-3">
                <div className="flex justify-between"><span className="h-4 w-20 rounded-full bg-slate-100" /><span className="h-4 w-24 rounded-full bg-slate-100" /></div>
                <div className="flex justify-between"><span className="h-4 w-14 rounded-full bg-slate-100" /><span className="h-4 w-16 rounded-full bg-slate-100" /></div>
                <div className="flex justify-between border-t border-black/6 pt-3"><span className="h-5 w-16 rounded-full bg-slate-200/80" /><span className="h-5 w-28 rounded-full bg-slate-200/80" /></div>
              </div>
            ) : (
              <div className="mt-5 space-y-3 text-sm text-[color:var(--foreground-soft)]">
                <div className="flex justify-between"><span>Subtotal sin IGV</span><span className="font-medium text-[color:var(--foreground)]">S/ {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-black/6 pt-3 text-base font-semibold text-[color:var(--foreground)]"><span>Total con IGV</span><span>S/ {totalWithIgv.toFixed(2)}</span></div>
              </div>
            )}
            <button
              disabled={!items.length || loading}
              onClick={openContact}
              className="btn-primary mt-6 block w-full rounded-full bg-[color:var(--foreground)] py-3 text-center text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              Realizar solicitud de pedido
            </button>
          </aside>
        </div>
      </div>

      {contactOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(14,20,32,0.54)] p-4 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="contact-title" className="surface-card-strong soft-outline max-h-[92svh] w-full max-w-md overflow-y-auto p-6 text-[color:var(--foreground)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">Contacto</div>
                <h3 id="contact-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Completa tu solicitud</h3>
              </div>
              <button ref={closeContactRef} onClick={closeContact} className="btn-secondary min-h-11 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm" aria-label="Cerrar solicitud">
                Cerrar
              </button>
            </div>

            <p className="mt-4 rounded-[18px] border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">Esta solicitud no realiza ningún cobro. Te contactaremos por WhatsApp para confirmar disponibilidad, forma de pago y entrega.</p>
            <form onSubmit={(event) => { event.preventDefault(); void sendContact(); }} className="mt-5">
            <div className="grid gap-4">
              <label className="grid gap-1.5 text-sm font-semibold">Nombre completo
                <input value={contactName} onChange={(e) => { setContactName(e.target.value); setFieldErrors((value) => ({ ...value, name: "" })); }} className="px-4 py-3 font-normal" autoComplete="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined} />
                {fieldErrors.name && <span id="name-error" role="alert" className="text-xs font-medium text-red-600">{fieldErrors.name}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Número de WhatsApp
                <input type="tel" inputMode="tel" value={contactPhone} onChange={(e) => { setContactPhone(e.target.value); setFieldErrors((value) => ({ ...value, phone: "" })); }} className="px-4 py-3 font-normal" placeholder="Ej.: 9XX XXX XXX" autoComplete="tel" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : "phone-help"} />
                <span id="phone-help" className="text-xs font-normal text-[color:var(--foreground-soft)]">Formato peruano: 9 dígitos, empezando por 9.</span>
                {fieldErrors.phone && <span id="phone-error" role="alert" className="text-xs font-medium text-red-600">{fieldErrors.phone}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Opción de entrega
              <select
                value={locationScope}
                onChange={(e) => {
                  const next = e.target.value as "almacen" | "punto_medio" | "";
                  setLocationScope(next);
                  setLocationValue("");
                  setFieldErrors((value) => ({ ...value, location: "", district: "" }));
                }}
                className="px-4 py-3"
              >
                <option value="">Selecciona una opción de entrega</option>
                <option value="almacen">Recoger en almacén</option>
                <option value="punto_medio">Pactar entrega en punto medio</option>
              </select>
              {fieldErrors.location && <span role="alert" className="text-xs font-medium text-red-600">{fieldErrors.location}</span>}
              </label>

              {locationScope === "punto_medio" && (
                <label className="grid gap-1.5 text-sm font-semibold">Distrito
                <select
                  value={locationValue}
                  onChange={(e) => setLocationValue(e.target.value)}
                  className="px-4 py-3"
                >
                  <option value="">Selecciona tu distrito</option>
                  {LIMA_CALLAO_DISTRICTS.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
                {fieldErrors.district && <span role="alert" className="text-xs font-medium text-red-600">{fieldErrors.district}</span>}
                </label>
              )}
            </div>

            {contactError && <div role="alert" className="mt-4 text-sm text-red-600">{contactError}</div>}

            <div className="mt-5">
              <button
                type="submit"
                disabled={savingContact}
                className="btn-primary min-h-11 w-full rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-medium text-white hover:bg-[color:var(--accent-strong)] disabled:cursor-wait disabled:opacity-50"
              >
                {savingContact ? "Enviando…" : "Enviar solicitud"}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(14,20,32,0.54)] p-4 backdrop-blur-sm">
          <div role="status" aria-live="polite" className="surface-card-strong soft-outline w-full max-w-md p-6 text-[color:var(--foreground)]">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold tracking-[-0.04em]">Solicitud enviada</h3>
              <button onClick={() => setConfirmOpen(false)} className="btn-secondary rounded-full border border-black/10 bg-white/70 px-3 py-2 text-sm" aria-label="Cerrar">
                Cerrar
              </button>
            </div>
            <div className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
              Recibimos tu solicitud. Te contactaremos por WhatsApp para confirmar disponibilidad y coordinar los siguientes pasos.
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
