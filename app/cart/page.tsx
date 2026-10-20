"use client";
import React from "react";
import { whatsappUrl } from "@/lib/store-config";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PriceWithIgv from "@/app/components/PriceWithIgv";
import { catalogFacts, formatRam, publicSku, screenSizeLabel } from "@/lib/catalog-display";
import { catalogPrice, formatSoles, withIgv } from "@/lib/catalog-price";
import { reportGoogleAdsConversion } from "@/lib/google-ads";
import { trackCatalogEvent } from "@/lib/analytics";
import {
  addToCart,
  clearCartItemsCache,
  getCachedCartItems,
  listCartItems,
  persistCartItemsCache,
  removeCartItem,
  submitContactRequest,
  getDeliveryConfig,
  type DeliveryOptionPublic,
  type DeliveryPointPublic,
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

function DistrictPicker({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const id = React.useId();
  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  const matches = LIMA_CALLAO_DISTRICTS.filter((district) => normalize(district).includes(normalize(value)));
  const choose = (district: string) => { onChange(district); setOpen(false); setActiveIndex(-1); };

  React.useEffect(() => {
    if (open) pickerRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  React.useEffect(() => {
    if (open && activeIndex >= 0) listRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  return (
    <div ref={pickerRef} className="min-w-0" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">Distrito</label>
      <div className={`overflow-hidden rounded-[16px] border bg-white transition-colors focus-within:border-[color:var(--accent)] focus-within:ring-2 focus-within:ring-[color:var(--brand-tint)] ${error ? "border-red-400" : "border-[color:var(--border-strong)]"}`}>
      <div className="relative">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-current text-[color:var(--foreground-soft)]" strokeWidth="1.8"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg>
        <input
          id={id} role="combobox" aria-autocomplete="list" aria-expanded={open}
          aria-controls={open ? `${id}-list` : undefined}
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : `${id}-help`}
          value={value} placeholder="Escribe tu distrito" maxLength={80} autoComplete="off" spellCheck={false}
          className="w-full rounded-none border-0 bg-transparent py-3 pl-11 pr-10 text-sm shadow-none outline-none focus:border-0 focus:shadow-none focus:outline-none"
          style={{ border: "none", borderRadius: 0, boxShadow: "none", background: "transparent" }}
          onFocus={() => { setOpen(true); setActiveIndex(-1); }}
          onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(-1); }}
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault(); setOpen(true);
              setActiveIndex((current) => !matches.length ? -1 : current < 0 ? (event.key === "ArrowDown" ? 0 : matches.length - 1) : (current + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
            }
            if (event.key === "Enter" && open) { event.preventDefault(); if (activeIndex >= 0 && matches[activeIndex]) choose(matches[activeIndex]); else setOpen(false); }
          }}
        />
        <svg aria-hidden="true" viewBox="0 0 20 20" className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-current text-[color:var(--foreground-soft)] transition-transform ${open ? "rotate-180" : ""}`} strokeWidth="1.7"><path d="m5 8 5 5 5-5" /></svg>
      </div>
      {open && (
        <div className="mx-2 border-t border-[color:var(--border)]">
          <div ref={listRef} id={`${id}-list`} role="listbox" aria-label="Distritos de Lima y Callao" className="max-h-44 overflow-y-auto overscroll-contain p-1.5" style={{ scrollbarWidth: "thin" }}>
            {matches.map((district, index) => (
              <button key={district} id={`${id}-option-${index}`} type="button" role="option" aria-selected={value === district} tabIndex={-1}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] px-3 text-left text-sm transition-colors ${activeIndex === index || value === district ? "bg-[color:var(--brand-tint)] font-semibold text-[color:var(--accent-strong)]" : "text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)]"}`}
                onMouseDown={(event) => event.preventDefault()} onClick={() => choose(district)}>
                {district}{value === district && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
          {!matches.length && <p className="px-4 pb-3 text-sm text-[color:var(--foreground-soft)]">Sin coincidencias. Puedes dejar tu distrito escrito para coordinarlo por WhatsApp.</p>}
        </div>
      )}
      </div>
      <p id={`${id}-help`} className="mt-1.5 text-xs text-[color:var(--foreground-soft)]">Busca y elige tu distrito para coordinar la entrega.</p>
      {error && <span id={`${id}-error`} role="alert" className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </div>
  );
}

function parseNotes(notes: any) {
  try {
    return typeof notes === "string" ? JSON.parse(notes) : notes || {};
  } catch {
    return {};
  }
}

function priceFromRow(row: CartRow): number {
  // Una oferta aceptada manda; si no, el mismo precio que muestra la ficha.
  if (row?.offer_price) return Number(row.offer_price);
  return catalogPrice(row).price;
}

function cartScreenTitle(title: string, facts: ReturnType<typeof catalogFacts>) {
  // El número de iPhone es el modelo; Apple Watch usa milímetros.
  if (/iphone|watch/i.test(facts.category) || !/macbook|ipad|imac|display|monitor/i.test(`${facts.category} ${title}`)) return title;
  const raw = String(facts.detail.tamaño || facts.detail.tamano || facts.detail.tamanio || "").trim();
  const size = raw.match(/^(\d+(?:[.,]\d+)?)(?:\s*(?:pulgadas|["″]))?$/i)?.[1];
  if (!size) return title;
  const pattern = new RegExp(`\\b${size.replace(/[.,]/g, "[.,]")}\\b(?:\\s*(?:pulgadas|[\"″]))?(?!\\s*(?:GB|TB|mm)\\b)`, "i");
  return pattern.test(title) ? title.replace(pattern, screenSizeLabel(facts.category, size)) : title;
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
  const [locationScope, setLocationScope] = React.useState<"almacen" | "punto_medio" | "shalom" | "">("");
  const [locationValue, setLocationValue] = React.useState("");
  const [deliveryOptions, setDeliveryOptions] = React.useState<DeliveryOptionPublic[] | null>(null);
  const [deliveryPoints, setDeliveryPoints] = React.useState<DeliveryPointPublic[]>([]);
  const [optionId, setOptionId] = React.useState("");
  const [pointId, setPointId] = React.useState("");
  const [pointText, setPointText] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [requestNumbers, setRequestNumbers] = React.useState<string[]>([]);
  // Una clave por intento de envío: si se repite (doble clic, red lenta), el
  // servidor devuelve la misma solicitud en vez de duplicarla.
  const submissionKeyRef = React.useRef("");
  // Bloquea un segundo clic antes de que React actualice el estado del botón.
  const sendingRef = React.useRef(false);
  const closeContactRef = React.useRef<HTMLButtonElement>(null);
  const selectedOption = deliveryOptions?.find((option) => option.id === optionId) || null;

  // Recupera lo escrito si el visitante cierra el formulario o recarga la página.
  React.useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("ms_request_draft");
      if (!raw) return;
      const draft = JSON.parse(raw);
      setContactName(String(draft.name || ""));
      setContactPhone(String(draft.phone || ""));
      setNotes(String(draft.notes || ""));
    } catch {}
  }, []);
  React.useEffect(() => {
    try {
      window.sessionStorage.setItem("ms_request_draft", JSON.stringify({ name: contactName, phone: contactPhone, notes }));
    } catch {}
  }, [contactName, contactPhone, notes]);

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

  // Último equipo quitado, para poder deshacerlo. Se vuelve a agregar con el
  // servidor, que comprueba otra vez la disponibilidad.
  const [removed, setRemoved] = React.useState<{ row: CartRow; title: string } | null>(null);
  const [itemError, setItemError] = React.useState("");
  const changeQty = async (row: CartRow, next: number) => {
    setItemError("");
    try {
      await updateCartItem(row.id, next);
      syncCache(items.map((it) => (it.id === row.id ? { ...it, qty: next } : it)));
    } catch (err: any) {
      setItemError(err?.message || "No pudimos cambiar la cantidad. Inténtalo de nuevo.");
    }
  };
  const removeRow = async (row: CartRow, title: string) => {
    setItemError("");
    try {
      await removeCartItem(row.id);
      syncCache(items.filter((it) => it.id !== row.id));
      setRemoved({ row, title });
    } catch (err: any) {
      setItemError(err?.message || "No pudimos quitar el equipo. Inténtalo de nuevo.");
    }
  };
  const undoRemove = async () => {
    if (!removed) return;
    const productId = String((removed.row as any).product_id || removed.row.product?.id || "");
    setRemoved(null);
    if (!productId) return;
    try {
      const offer = removed.row.offer_price ? Number(removed.row.offer_price) : undefined;
      await addToCart(productId, Number(removed.row.qty || 1), offer && Number.isFinite(offer) ? offer : undefined);
      const res = await listCartItems();
      syncCache(res.items || []);
    } catch (err: any) {
      setItemError(err?.message || "No pudimos volver a agregar el equipo. Puede que ya no esté disponible.");
    }
  };

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
  const totalWithIgv = withIgv(subtotal);

  const openContact = () => {
    for (const row of items) trackCatalogEvent("start_order_request", { items: items.length, product_id: row.product?.id ? String(row.product.id) : undefined });
    setContactError("");
    setFieldErrors({});
    if (!submissionKeyRef.current) submissionKeyRef.current = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    setContactOpen(true);
    if (deliveryOptions === null) {
      getDeliveryConfig()
        .then((config) => {
          setDeliveryOptions(config.options || []);
          setDeliveryPoints(config.points || []);
        })
        // Si no se pueden cargar, se usa el formulario anterior (almacén / punto medio).
        .catch(() => setDeliveryOptions([]));
    }
  };

  const closeContact = () => {
    if (savingContact) return;
    setContactOpen(false);
  };

  const useConfiguredOptions = Boolean(deliveryOptions && deliveryOptions.length);
  const isShalom = useConfiguredOptions ? selectedOption?.code === "shalom" : locationScope === "shalom";
  const pointsForOption = selectedOption ? deliveryPoints.filter((point) => point.kind !== "warehouse") : [];

  const sendContact = async () => {
    if (savingContact || sendingRef.current) return;
    const name = contactName.trim();
    const phone = contactPhone.replace(/\D+/g, "");
    const errors: Record<string, string> = {};
    if (name.length < 2) errors.name = "Ingresa tu nombre completo.";
    if (!/^9\d{8}$/.test(phone)) errors.phone = "Ingresa un número peruano de 9 dígitos que comience con 9.";
    if (useConfiguredOptions) {
      if (!selectedOption) errors.location = "Selecciona una opción de entrega.";
      if (selectedOption?.requiresPoint && (!pointId || pointId === "__otro") && !pointText.trim()) errors.point = "Elige un punto o escribe el lugar.";
      if (selectedOption?.requiresDistrict && !locationValue.trim()) errors.district = isShalom ? "Escribe tu ciudad y distrito." : "Escribe tu distrito.";
      if (selectedOption?.requiresAddress && !address.trim()) errors.address = "Escribe la dirección de entrega.";
    } else {
      if (!locationScope) errors.location = "Selecciona una opción de entrega.";
      if ((locationScope === "punto_medio" || locationScope === "shalom") && !locationValue.trim()) errors.district = isShalom ? "Escribe tu ciudad y distrito." : "Escribe tu distrito.";
    }
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    sendingRef.current = true;
    setSavingContact(true);
    setContactError("");
    try {
      const result = await submitContactRequest(useConfiguredOptions && selectedOption
        ? {
            name,
            phone,
            deliveryOptionId: selectedOption.id,
            deliveryPointId: pointId && pointId !== "__otro" ? pointId : undefined,
            pointText: !pointId || pointId === "__otro" ? pointText.trim() || undefined : undefined,
            district: locationValue.trim() || undefined,
            address: address.trim() || undefined,
            notes: notes.trim() || undefined,
            submissionKey: submissionKeyRef.current,
          }
        : {
            name,
            phone,
            locationScope: locationScope as "almacen" | "punto_medio" | "shalom",
            locationValue: locationScope === "almacen" ? "Recoger en almacen" : locationValue.trim(),
            district: locationScope === "almacen" ? undefined : locationValue.trim(),
            notes: notes.trim() || undefined,
            submissionKey: submissionKeyRef.current,
          });
      trackCatalogEvent("complete_order_request", { items: items.length });
      // Count only requests that the server accepted, not attempted submissions.
      reportGoogleAdsConversion("AW-18491059831/wm_qCMXiwo4dEPfcnPFE");
      clearCartItemsCache();
      setItems([]);
      setRequestNumbers(result?.numbers || []);
      submissionKeyRef.current = "";
      try { window.sessionStorage.removeItem("ms_request_draft"); } catch {}
      setContactName("");
      setContactPhone("");
      setLocationScope("");
      setLocationValue("");
      setOptionId("");
      setPointId("");
      setPointText("");
      setAddress("");
      setNotes("");
      setContactOpen(false);
      setConfirmOpen(true);
    } catch (e: any) {
      setContactError(e?.message || "No se pudo enviar tu solicitud.");
      // Si algún equipo dejó de estar disponible, el carrito se actualiza para mostrarlo.
      void loadCart();
    } finally {
      sendingRef.current = false;
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

        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6">
          <section aria-label="Equipos en tu carrito" className="surface-card soft-outline min-w-0 px-4 sm:px-6">
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
            {itemError && <div role="alert" className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{itemError}</div>}
            {removed && (
              <div role="status" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                <span>Quitaste «{removed.title}» del carrito.</span>
                <span className="flex gap-2">
                  <button type="button" onClick={undoRemove} className="min-h-11 rounded-full bg-[color:var(--foreground)] px-4 font-semibold text-white">Deshacer</button>
                  <button type="button" onClick={() => setRemoved(null)} aria-label="Cerrar aviso" className="min-h-11 rounded-full px-3 text-slate-600">×</button>
                </span>
              </div>
            )}
            {items.map((row) => {
              const img = (row?.product?.images && row.product.images[0]) || row?.staged?.images?.[0] || "/placeholder.svg";
              const facts = catalogFacts(row);
              const title = cartScreenTitle(row?.product?.title || row?.staged?.title || "Producto", facts);
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
              const ram = formatRam(facts.ram);
              const storage = facts.storage;
              const color = String(row?.product?.color || row?.staged?.color || facts.notes?.color || "").trim();
              const sku = publicSku(row?.product?.sku || row?.staged?.sku);
              return (
                <article key={row.id} aria-label={title} className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-4 border-b border-[color:var(--border)] py-5 last:border-b-0 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-x-5 sm:py-6">
                  <button
                    type="button"
                    aria-label={`Ver fotos y ficha de ${title}`}
                    disabled={!canNavigate}
                    className="relative aspect-square w-full self-start overflow-hidden rounded-[18px] bg-[color:var(--surface-muted)] sm:rounded-[22px]"
                    onClick={goToProduct}
                  >
                    <Image src={img} alt={title} fill sizes="(min-width: 640px) 132px, 88px" className="object-contain p-1.5" />
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[color:var(--foreground-soft)]">
                      {condition && <span className="font-medium">{condition}</span>}
                      {condition && sku && <span aria-hidden="true">·</span>}
                      {sku && <span>SKU {sku}</span>}
                    </div>
                    <h2 className="mt-1 break-words text-base font-semibold leading-5 tracking-tight text-[color:var(--foreground)] sm:text-lg sm:leading-6">{title}</h2>
                    <p className="mt-1.5 break-words text-xs leading-5 text-[color:var(--foreground-soft)] sm:text-sm">{[facts.processor, ram && `${ram} RAM`, storage, color].filter(Boolean).join(" · ")}</p>
                    <PriceWithIgv price={unitPrice} wrapperClassName="mt-3" priceClassName="text-xl font-bold tracking-tight text-emerald-700 sm:text-2xl" labelClassName="text-[10px] font-semibold uppercase tracking-wide text-red-600" igvClassName="mt-0.5" />
                    {facts.hasConditionDetails && <p className="mt-2 text-xs font-medium text-amber-800">Detalle estético registrado en la ficha.</p>}
                    {canNavigate && <button type="button" onClick={goToProduct} className="mt-1 min-h-11 text-xs font-semibold text-[color:var(--accent)] underline-offset-4 hover:underline sm:text-sm">Volver a la ficha <span aria-hidden="true">↗</span></button>}
                  </div>
                  <div className="col-span-2 flex min-w-0 items-start justify-between gap-3 border-t border-[color:var(--border)] pt-4">
                    <div className="min-w-0">
                    <div className="inline-flex items-center rounded-full border border-[color:var(--border-strong)] bg-white p-0.5" role="group" aria-label={`Cantidad de ${title}`}>
                    <button
                      type="button"
                      aria-label={`Reducir cantidad de ${title}`}
                      disabled={qtyValue <= 1}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-[color:var(--surface-muted)] disabled:opacity-35"
                      onClick={() => changeQty(row, Math.max(1, qtyValue - 1))}
                    >
                      -
                    </button>
                    <span className="min-w-[32px] text-center text-sm font-medium text-[color:var(--foreground)]">{row.qty || 1}</span>
                    <button
                      type="button"
                      aria-label={canIncrease ? `Aumentar cantidad de ${title}` : "No se puede aumentar: solo hay una unidad disponible"}
                      disabled={!canIncrease}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-[color:var(--surface-muted)] disabled:opacity-35"
                      onClick={() => { if (canIncrease) changeQty(row, Math.min(maxQty, qtyValue + 1)); }}
                    >
                      +
                    </button>
                    </div>
                    {!canIncrease && <p className="mt-1.5 text-[11px] leading-4 text-[color:var(--foreground-soft)]">{maxQty === 1 ? "Solo hay una unidad disponible." : `Máximo ${maxQty} unidades disponibles.`}</p>}
                    </div>
                    <button
                      type="button"
                      aria-label={`Quitar ${title} del carrito`}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[color:var(--foreground-soft)] hover:bg-red-50 hover:text-red-700"
                      onClick={() => removeRow(row, title)}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.7"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" /></svg>Quitar
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          <aside aria-label="Resumen del pedido" className="surface-card soft-outline min-w-0 p-5 sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-lg font-semibold tracking-tight text-[color:var(--foreground)]">Resumen del pedido</h2>
            {loading && !items.length ? (
              <div className="mt-5 space-y-3">
                <div className="flex justify-between"><span className="h-4 w-20 rounded-full bg-slate-100" /><span className="h-4 w-24 rounded-full bg-slate-100" /></div>
                <div className="flex justify-between"><span className="h-4 w-14 rounded-full bg-slate-100" /><span className="h-4 w-16 rounded-full bg-slate-100" /></div>
                <div className="flex justify-between border-t border-black/6 pt-3"><span className="h-5 w-16 rounded-full bg-slate-200/80" /><span className="h-5 w-28 rounded-full bg-slate-200/80" /></div>
              </div>
            ) : (
              <div className="mt-5 space-y-3 text-sm text-[color:var(--foreground-soft)]">
                <div className="flex justify-between gap-3"><span>Subtotal sin IGV</span><span className="shrink-0 font-medium text-[color:var(--foreground)]">{formatSoles(subtotal)}</span></div>
                <div className="flex justify-between gap-3"><span>IGV (18%)</span><span className="shrink-0 font-medium text-[color:var(--foreground)]">{formatSoles(totalWithIgv - subtotal)}</span></div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-t border-[color:var(--border)] pt-4 font-semibold text-[color:var(--foreground)]"><span>Equipos con IGV</span><span className="text-2xl tracking-tight">{formatSoles(totalWithIgv)}</span></div>
                <p className="text-xs leading-5">La entrega y cualquier cargo según el medio de pago se confirman antes del pago. Esta solicitud no realiza un cobro.</p>
              </div>
            )}
            <button
              disabled={!items.length || loading}
              onClick={openContact}
              className="btn-primary mt-5 block min-h-12 w-full rounded-full bg-[color:var(--accent)] px-4 py-3 text-center text-sm font-semibold text-white hover:bg-[color:var(--accent-strong)] disabled:opacity-50"
            >
              Realizar solicitud de pedido
            </button>
          </aside>
        </div>
      </div>

      {contactOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(14,20,32,0.54)] p-3 backdrop-blur-sm sm:p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="contact-title" className="surface-card-strong soft-outline flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden text-[color:var(--foreground)] sm:max-h-[calc(100dvh-2rem)]">
            <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">Contacto</div>
                <h3 id="contact-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em]">Completa tu solicitud</h3>
              </div>
              <button ref={closeContactRef} onClick={closeContact} className="btn-secondary min-h-11 rounded-full border border-black/10 bg-white/70 px-4 py-2 text-sm" aria-label="Cerrar solicitud">
                Cerrar
              </button>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); void sendContact(); }} className="flex min-h-0 flex-col">
            <div data-contact-scroll className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-1 sm:px-6" style={{ scrollbarWidth: "thin", scrollbarGutter: "stable" }}>
            <p className="rounded-[18px] border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">Esta solicitud no realiza ningún cobro. Te contactaremos por WhatsApp para confirmar disponibilidad, forma de pago y entrega.</p>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm font-semibold">Nombre completo
                <input value={contactName} onChange={(e) => { setContactName(e.target.value); setFieldErrors((value) => ({ ...value, name: "" })); }} className="px-4 py-3 font-normal" autoComplete="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : undefined} />
                {fieldErrors.name && <span id="name-error" role="alert" className="text-xs font-medium text-red-600">{fieldErrors.name}</span>}
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">Número de WhatsApp
                <input type="tel" inputMode="tel" value={contactPhone} onChange={(e) => { setContactPhone(e.target.value); setFieldErrors((value) => ({ ...value, phone: "" })); }} className="px-4 py-3 font-normal" placeholder="Ej.: 9XX XXX XXX" autoComplete="tel" aria-invalid={Boolean(fieldErrors.phone)} aria-describedby={fieldErrors.phone ? "phone-error" : "phone-help"} />
                <span id="phone-help" className="text-xs font-normal text-[color:var(--foreground-soft)]">Formato peruano: 9 dígitos, empezando por 9.</span>
                {fieldErrors.phone && <span id="phone-error" role="alert" className="text-xs font-medium text-red-600">{fieldErrors.phone}</span>}
              </label>
              {deliveryOptions === null ? (
                <div className="text-sm text-[color:var(--foreground-soft)]" role="status">Cargando opciones de entrega…</div>
              ) : useConfiguredOptions ? (
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-semibold">Opción de entrega</legend>
                  {deliveryOptions.map((option) => (
                    <label key={option.id} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-[16px] border px-4 py-3 text-sm ${optionId === option.id ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]" : "border-black/10 bg-white"}`}>
                      <input
                        type="radio"
                        name="delivery-option"
                        className="mt-1 h-4 w-4"
                        checked={optionId === option.id}
                        onChange={() => {
                          setOptionId(option.id);
                          setPointId("");
                          setPointText("");
                          setLocationValue("");
                          setAddress("");
                          setFieldErrors((value) => ({ ...value, location: "", point: "", district: "", address: "" }));
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-2 font-semibold">
                          {option.name}
                          <span className="text-xs font-medium text-[color:var(--foreground-soft)]">
                            {option.cost > 0 ? `S/ ${option.cost.toFixed(2)}` : option.costNote || "Sin costo"}
                          </span>
                        </span>
                        {option.description && <span className="mt-0.5 block font-normal text-[color:var(--foreground-soft)]">{option.description}</span>}
                        {option.schedule && <span className="mt-0.5 block text-xs font-normal text-[color:var(--foreground-soft)]">Horario: {option.schedule}</span>}
                        {option.conditions && <span className="mt-0.5 block text-xs font-normal text-[color:var(--foreground-soft)]">{option.conditions}</span>}
                      </span>
                    </label>
                  ))}
                  {fieldErrors.location && <span role="alert" className="text-xs font-medium text-red-600">{fieldErrors.location}</span>}
                </fieldset>
              ) : (
                <label className="grid gap-1.5 text-sm font-semibold">Opción de entrega
                <select
                  value={locationScope}
                  onChange={(e) => {
                    const next = e.target.value as "almacen" | "punto_medio" | "shalom" | "";
                    setLocationScope(next);
                    setLocationValue("");
                    setFieldErrors((value) => ({ ...value, location: "", district: "" }));
                  }}
                  className="px-4 py-3"
                >
                  <option value="">Selecciona una opción de entrega</option>
                  <option value="almacen">Recoger en almacén · Sin costo</option>
                  <option value="punto_medio">Entrega en punto medio · Por calcular</option>
                  <option value="shalom">Envío por Shalom · Por calcular</option>
                </select>
                {fieldErrors.location && <span role="alert" className="text-xs font-medium text-red-600">{fieldErrors.location}</span>}
                </label>
              )}

              {!useConfiguredOptions && locationScope === "punto_medio" && <p className="text-sm text-[color:var(--foreground-soft)]">Pago contraentrega: no pagas ningún adelanto. Pagas el equipo al recibirlo. Coordinaremos el punto de encuentro y el costo de la entrega por WhatsApp según tu distrito.</p>}
              {!useConfiguredOptions && isShalom && <p className="rounded-[16px] border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-950">El envío por Shalom se realiza previo pago total del equipo. Coordinaremos la agencia de destino y el costo por WhatsApp.</p>}

              {useConfiguredOptions && selectedOption && selectedOption.kind !== "pickup" && selectedOption.code !== "punto_medio" && !isShalom && (pointsForOption.length > 0 || selectedOption.requiresPoint) && (
                <label className="grid gap-1.5 text-sm font-semibold">Punto de encuentro{selectedOption.requiresPoint ? "" : " (opcional)"}
                  {pointsForOption.length > 0 && (
                    <select value={pointId} onChange={(e) => { setPointId(e.target.value); setFieldErrors((value) => ({ ...value, point: "" })); }} className="px-4 py-3">
                      <option value="">{selectedOption.requiresPoint ? "Elige un punto" : "Sin preferencia"}</option>
                      {pointsForOption.map((point) => (
                        <option key={point.id} value={point.id}>{point.name}{point.district ? ` · ${point.district}` : ""}</option>
                      ))}
                      <option value="__otro">Otro lugar</option>
                    </select>
                  )}
                  {(pointId === "__otro" || pointsForOption.length === 0) && (
                    <input value={pointText} onChange={(e) => { setPointText(e.target.value); setFieldErrors((value) => ({ ...value, point: "" })); }} className="px-4 py-3 font-normal" placeholder="Ej.: CC Jockey Plaza, puerta 1" maxLength={120} />
                  )}
                  {fieldErrors.point && <span role="alert" className="text-xs font-medium text-red-600">{fieldErrors.point}</span>}
                </label>
              )}

              {((useConfiguredOptions && selectedOption?.requiresDistrict) || (!useConfiguredOptions && (locationScope === "punto_medio" || locationScope === "shalom"))) && (
                isShalom ? <label className="grid gap-1.5 text-sm font-semibold">Ciudad y distrito de destino
                <input
                  value={locationValue}
                  onChange={(e) => { setLocationValue(e.target.value); setFieldErrors((value) => ({ ...value, district: "" })); }}
                  className="px-4 py-3 font-normal"
                  placeholder={isShalom ? "Ej.: Arequipa, Cerro Colorado" : "Escribe tu distrito"}
                  maxLength={80}
                  autoComplete="address-level3"
                  spellCheck={false}
                  aria-invalid={Boolean(fieldErrors.district)}
                />
                {fieldErrors.district && <span role="alert" className="text-xs font-medium text-red-600">{fieldErrors.district}</span>}
                </label>
                : <DistrictPicker value={locationValue} onChange={(value) => { setLocationValue(value); setFieldErrors((current) => ({ ...current, district: "" })); }} error={fieldErrors.district} />
              )}

              {useConfiguredOptions && selectedOption?.requiresAddress && (
                <label className="grid gap-1.5 text-sm font-semibold">Dirección de entrega
                  <input value={address} onChange={(e) => { setAddress(e.target.value); setFieldErrors((value) => ({ ...value, address: "" })); }} className="px-4 py-3 font-normal" autoComplete="street-address" maxLength={200} />
                  {fieldErrors.address && <span role="alert" className="text-xs font-medium text-red-600">{fieldErrors.address}</span>}
                </label>
              )}

              <label className="grid gap-1.5 text-sm font-semibold">Observaciones (opcional)
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} className="px-4 py-3 font-normal" placeholder="Ej.: horario en que puedes recibirlo" />
              </label>
            </div>

            {contactError && <div role="alert" className="mt-4 text-sm text-red-600">{contactError}</div>}
            </div>
            <div className="shrink-0 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
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
            {requestNumbers.length > 0 && (
              <div className="mt-4 rounded-[18px] border border-black/8 bg-white p-4 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground-soft)]">{requestNumbers.length > 1 ? "Tus números de solicitud" : "Tu número de solicitud"}</div>
                <div className="mt-1 text-2xl font-semibold tracking-[-0.02em]">{requestNumbers.join(" · ")}</div>
              </div>
            )}
            <div className="mt-4 text-sm leading-6 text-[color:var(--foreground-soft)]">
              Recibimos tu solicitud. Te contactaremos por WhatsApp para confirmar disponibilidad y coordinar los siguientes pasos.
            </div>
            {requestNumbers.length > 0 && (
              <a
                href={whatsappUrl(`Hola, envié la solicitud ${requestNumbers.join(", ")} desde la web.`)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full border border-black/10 bg-white px-6 py-3 text-sm font-medium"
              >
                Escribir por WhatsApp
              </a>
            )}
            <button onClick={() => setConfirmOpen(false)} className="btn-primary mt-5 w-full rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white">
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
