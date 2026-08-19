import ProductGallery from "@/app/components/ProductGallery";
import AddToCartClient from "@/app/components/AddToCartClient";
import ProductViewTracker from "@/app/components/ProductViewTracker";
import PriceWithIgv from "@/app/components/PriceWithIgv";
import ProductDetailPhotos from "@/app/components/ProductDetailPhotos";
import { getCatalogItem } from "@/app/actions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatStorageCompact, formatStorageDisplay } from "@/lib/storage";
import { buildAppleWatchTitle } from "@/lib/watch";
import { formatWarrantyDate, warrantyStatus } from "@/lib/warranty";

export const revalidate = 300;

function parseNotes(notes: any) {
  try {
    return typeof notes === "string" ? JSON.parse(notes) : notes || {};
  } catch {
    return {};
  }
}

function formatIncludesAccessories(value: string, cuboFake: boolean, cableFake: boolean) {
  let formatted = String(value || "");
  if (cuboFake) formatted = formatted.replace(/\bCubo\b/i, "Cubo Genérico");
  if (cableFake) formatted = formatted.replace(/\bCable\b/i, "Cable Genérico");
  return formatted;
}

function buildIphoneTitle(number?: number | string | null, model?: string | null, storageGb?: number | string | null, color?: string | null) {
  const n = number ? String(number).trim() : "";
  const m = model ? String(model).trim() : "";
  const s = formatStorageCompact(storageGb);
  const c = color ? String(color).trim() : "";
  if (!n || !m || !s || !c) return "";
  const cap = c.charAt(0).toUpperCase() + c.slice(1);
  return `iPhone ${n} ${m} ${s} ${cap}`.trim();
}

function formatSpanishDate(dateValue?: string | null) {
  const raw = String(dateValue || "").trim();
  if (!raw) return "";
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00-05:00` : raw);
  if (Number.isNaN(d.getTime())) return raw;
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value || String(d.getDate());
  const month = parts.find((p) => p.type === "month")?.value || "";
  const year = parts.find((p) => p.type === "year")?.value || String(d.getFullYear());
  return `${day} de ${month} de ${year}`.trim();
}

function parseWarrantyFlag(value: any) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return null;
  return ["1", "true", "si", "sí", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function formatWarrantyValue(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return formatSpanishDate(raw);
  return raw;
}

function toneForCondition(condition: string, sold?: boolean) {
  if (sold) return "bg-[rgba(15,23,42,0.92)] text-white";
  if (condition.toLowerCase().includes("agotado")) return "bg-[rgba(255,235,235,0.96)] text-[#9f1d1d]";
  const value = condition.toLowerCase();
  if (value.includes("nuevo")) return "bg-[rgba(230,245,236,0.94)] text-[#1f6c43]";
  if (value.includes("open")) return "bg-[rgba(255,242,214,0.96)] text-[#8a5b11]";
  if (value.includes("usad")) return "bg-[rgba(231,239,255,0.96)] text-[#305fbe]";
  return "bg-white/88 text-[color:var(--foreground-soft)]";
}

function isNewCondition(condition: unknown) {
  return String(condition || "").toLowerCase().includes("nuevo");
}

function publicSku(value: unknown) {
  return String(value || "").trim().replace(/^MS(?:[-_\s]+)?/i, "");
}

function variantOptionLabel(variant: any) {
  const batteryHealth = variant?.batteryHealth ?? variant?.battery_health ?? variant?.bateria?.salud;
  const includes = String(variant?.includes || "").trim();
  const pieces = [
    variant?.color,
    batteryHealth ? `${batteryHealth}% bateria` : "",
    includes && includes !== "Ninguno" ? includes : "",
  ].filter(Boolean);
  return String(variant?.variantLabel || pieces.join(" · ") || variant?.title || "Opcion");
}

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = (await searchParams) || {};
  const { item } = await getCatalogItem(slug).catch(() => ({ item: null as any }));
  if (!item) return <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-[color:var(--foreground-soft)]">Producto no encontrado.</div>;
  if (item.slug && item.slug !== slug) {
    const suffix = new URLSearchParams(
      Object.entries(query).flatMap(([key, value]) =>
        Array.isArray(value) ? value.map((entry) => [key, entry]) : value === undefined ? [] : [[key, value]]
      )
    ).toString();
    redirect(`/product/${item.slug}${suffix ? `?${suffix}` : ""}`);
  }

  const images: string[] = Array.isArray(item.images) && item.images.length ? item.images : Array.isArray(item.staged?.images) ? item.staged.images : [];
  const category = String(item.category || item.staged?.category || item.product?.category || "").toLowerCase();
  const titleFallback: string = item.product?.title || item.staged?.title || item.slug;
  const productId: string = item.product?.id || item.product_id || "";
  const notes = parseNotes(item.staged?.notes);
  const product = item.product || {};
  const staged = item.staged || {};
  const saleType = String(product?.sale_type || staged?.sale_type || notes?.saleType || "").toUpperCase();
  const salePrice = Number(product?.price ?? staged?.price ?? 0);
  const discount = Number(product?.discount ?? staged?.discount ?? notes?.discount ?? notes?.descuentoPorc ?? 0);
  const finalPrice = product?.final_price ?? staged?.final_price ?? notes?.finalPrice ?? null;
  let price: number = salePrice;
  let compareAt: number | null = null;
  const rawOffer = Array.isArray(query?.offer) ? query?.offer[0] : query?.offer;
  const offerApplied = rawOffer !== undefined && rawOffer !== null && rawOffer !== "";
  const offerPrice = offerApplied ? Number(rawOffer) : NaN;
  const specsAny: any = notes?.specs || notes || {};
  const det: any = specsAny?.detalle || notes?.detalle || {};
  const productDetails = String(det?.detalles || det?.productDetails || notes?.productDetails || notes?.detalles || "").trim();
  const proc: string = det?.procesador || "";
  const teclado: string = product?.keyboard_layout || staged?.keyboard_layout || det?.teclado || "";
  const tamPantalla: string = (() => {
    if (det && typeof det === "object") {
      const direct = det["tamaño"] || det.tamanio || det.tamano;
      if (direct) return String(direct);
      const key = Object.keys(det).find((k) => {
        const nk = k.toLowerCase().normalize("NFD").replace(/\p{Diacritic}+/gu, "");
        return nk === "tamano" || nk === "tamanio" || nk.startsWith("tam");
      });
      if (key && det[key]) return String(det[key]);
    }
    const d2: any = (notes as any)?.detalle || {};
    return d2["tamaño"] || d2.tamanio || d2.tamano || "";
  })();

  if (saleType === "PROMOCION") {
    const mode = String(notes?.discountMode || notes?.discountType || "percent").toLowerCase();
    const computed = finalPrice !== null
      ? Number(finalPrice)
      : +(mode === "amount" ? Math.max(0, salePrice - discount) : salePrice * (1 - discount / 100)).toFixed(2);
    if (isFinite(computed) && computed > 0) price = computed;
    compareAt = salePrice || null;
  } else if (!saleType && typeof notes?.precioLista !== "undefined") {
    compareAt = Number(notes.precioLista);
    if ((!price || price <= 0) && compareAt) {
      const d = Number(notes?.descuentoPorc || 0);
      const f = +(compareAt * (1 - d / 100)).toFixed(2);
      if (isFinite(f) && f > 0) price = f;
    }
  }
  if (offerApplied && isFinite(offerPrice) && offerPrice > 0) {
    compareAt = price;
    price = offerPrice;
  }

  const colorRaw = notes?.color ? String(notes.color) : product?.color || staged?.color || "";
  const colorCap = colorRaw ? colorRaw.charAt(0).toUpperCase() + colorRaw.slice(1) : "";

  const normalizeUnit = (val: any, fallbackUnit: "GB" | "TB" = "GB") => {
    if (!val && val !== 0) return "";
    const s = String(val).trim();
    if (!s) return "";
    if (/\b(gb|tb)\b/i.test(s)) return s.replace(/\s+/g, " ");
    if (/^\d+(\.\d+)?$/.test(s)) return `${s} ${fallbackUnit}`;
    return s;
  };

  const ramVal = normalizeUnit(det?.ram, "GB");
  const almVal = normalizeUnit(det?.almacenamiento, "GB");

  const iphoneModel = product?.iphone_model || staged?.iphone_model || notes?.iphoneModel || "";
  const iphoneNumber = product?.iphone_number ?? staged?.iphone_number ?? notes?.iphoneNumber;
  const storageGb = product?.storage_gb ?? staged?.storage_gb ?? notes?.storageGb ?? notes?.storage;
  const batteryCycles = product?.battery_cycles ?? staged?.battery_cycles ?? notes?.batteryCycles ?? notes?.bateria?.ciclos;
  const batteryHealth = product?.battery_health ?? staged?.battery_health ?? notes?.batteryHealth ?? notes?.bateria?.salud;
  const formatSimType = (value: any) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const normalized = raw.toLowerCase().normalize("NFD").replace(/\p{Diacritic}+/gu, "");
    if (["si", "yes", "true", "esim"].includes(normalized)) return "eSIM";
    if (["no", "false"].includes(normalized)) return "Chip físico";
    return raw;
  };
  const iphoneSimType = formatSimType(notes?.iphoneSimType || notes?.simType || notes?.chipType || det?.esim || det?.sim || specsAny?.sim);
  const iphoneTitle = category === "iphone" ? buildIphoneTitle(iphoneNumber, iphoneModel, storageGb, colorCap) : "";
  const isPreventa = saleType === "PREVENTA";
  const isPromocion = saleType === "PROMOCION";
  const promoMode = String(notes?.discountMode || notes?.discountType || "percent").toLowerCase();
  const promoSavings = compareAt && compareAt > price ? compareAt - price : 0;
  const promoLabel = isPromocion
    ? promoMode === "amount" && promoSavings > 0
      ? `Ahorra S/ ${promoSavings.toFixed(2)}`
      : discount > 0
        ? `${discount}% OFF`
        : promoSavings > 0
          ? `Ahorra S/ ${promoSavings.toFixed(2)}`
          : ""
    : "";
  const preventaFromRaw = notes?.preventaDateFrom || notes?.preventa?.from || "";
  const preventaToRaw = notes?.preventaDateTo || notes?.preventa?.to || "";
  const preventaFromLabel = formatSpanishDate(preventaFromRaw);
  const preventaToLabel = formatSpanishDate(preventaToRaw);
  const conectividad = det?.conectividad || notes?.conectividad || "";
  const gama = det?.gama || "";
  const watchType = notes?.watchType || "";
  const watchSeries = notes?.watchSeries || "";
  const watchVersion = notes?.watchVersion || "";
  const watchConnection = notes?.watchConnection || "";
  const watchSize = notes?.watchSize || det?.["tamaño"] || det?.tamanio || det?.tamano || "";
  const watchAccessories = notes?.watchAccessories || "";
  const watchTitle = category === "watch"
    ? buildAppleWatchTitle({ type: watchType, series: watchSeries, version: watchVersion, size: watchSize, connection: watchConnection })
    : "";
  const baseShownTitle = iphoneTitle || watchTitle || titleFallback;
  const baseTitle = isPreventa ? (/^preventa\s+/i.test(baseShownTitle) ? baseShownTitle : `Preventa ${baseShownTitle}`.trim()) : baseShownTitle;
  const tecladoLabel = teclado === "Ingles" ? "Ingles" : teclado === "Espanol" ? "Espanol" : teclado;
  const productCondition = product?.product_condition || staged?.product_condition || notes?.productCondition || notes?.estado || notes?.specs?.estado || "";
  const isSealed = String(productCondition || "").toLowerCase().includes("nuevo");
  const warrantyObject = [notes?.warranty, notes?.garantiaDetalle, notes?.garantia]
    .find((value) => value && typeof value === "object") || {};
  const rawWarrantyValue = notes?.warrantyDate
    ?? notes?.garantiaFecha
    ?? warrantyObject?.date
    ?? warrantyObject?.fecha
    ?? warrantyObject?.hasta
    ?? warrantyObject?.detalle
    ?? (typeof notes?.garantia === "string" ? notes.garantia : "");
  const warrantyType = notes?.warrantyType
    ?? notes?.garantiaTipo
    ?? notes?.tipoGarantia
    ?? warrantyObject?.type
    ?? warrantyObject?.tipo
    ?? "";
  const warrantyFlag = parseWarrantyFlag(
    notes?.warrantyEnabled ?? notes?.garantiaActiva ?? warrantyObject?.enabled ?? warrantyObject?.activa,
  );
  const hasWarranty = isSealed ? true : warrantyFlag ?? Boolean(String(rawWarrantyValue || warrantyType || "").trim());
  const warrantyExpired = hasWarranty && warrantyStatus(rawWarrantyValue) === "expired";
  const warrantyDetail = formatWarrantyValue(isSealed ? (rawWarrantyValue || "1 año de garantía") : rawWarrantyValue);
  const warrantyDisplay = warrantyExpired
    ? `Garantía Vencida: ${formatWarrantyDate(rawWarrantyValue)}`
    : hasWarranty ? [warrantyType, warrantyDetail].filter(Boolean).join(" · ") : "";
  const title = baseTitle;

  const especs: Array<{ label: string; value: any }> = [];
  if (productCondition) especs.push({ label: "Estado", value: productCondition });
  if (category === "macbook") {
    especs.push(
      { label: "Gama", value: gama },
      { label: "Procesador", value: proc },
      { label: "RAM", value: ramVal },
      { label: "SSD", value: almVal },
      { label: "Pantalla", value: tamPantalla },
      { label: "Ciclos", value: notes?.bateria?.ciclos },
      { label: "Salud bateria", value: notes?.bateria?.salud ? `${notes?.bateria?.salud}%` : "" },
      { label: "Color", value: colorCap },
      { label: "Teclado", value: tecladoLabel },
    );
  } else if (category === "ipad") {
    especs.push(
      { label: "Procesador", value: proc },
      { label: "Gama", value: gama },
      { label: "Pantalla", value: tamPantalla },
      { label: "Almacenamiento", value: almVal },
      { label: "Conectividad", value: conectividad },
      { label: "Ciclos", value: notes?.bateria?.ciclos },
      { label: "Salud bateria", value: notes?.bateria?.salud ? `${notes?.bateria?.salud}%` : "" },
      { label: "Color", value: colorCap },
    );
  } else if (category === "iphone") {
    especs.push(
      { label: "SIM", value: iphoneSimType },
      { label: "Modelo", value: iphoneModel },
      { label: "Numero", value: iphoneNumber },
      { label: "Almacenamiento", value: formatStorageDisplay(storageGb) },
      { label: "Ciclos", value: batteryCycles },
      { label: "Salud bateria", value: batteryHealth ? `${batteryHealth}%` : "" },
      { label: "Color", value: colorCap },
    );
  } else if (category === "watch") {
    especs.push(
      { label: "Tipo", value: watchType },
      { label: "Serie", value: watchType === "Normal" ? watchSeries : "" },
      { label: "Version", value: watchType === "Ultra" ? watchVersion : "" },
      { label: "Tamaño", value: watchSize ? `${String(watchSize).replace(/\s*mm$/i, "")} mm` : "" },
      { label: "Conexion", value: watchConnection },
      { label: "Accesorios", value: watchAccessories },
      { label: "Color", value: colorCap },
    );
  } else {
    especs.push(
      { label: "Color", value: colorCap }
    );
  }
  especs.push({ label: "SKU", value: publicSku(product?.sku || staged?.sku || notes?.manualSku || notes?.sourceSku) });

  const includesValue = product?.includes || staged?.includes || notes?.includes || notes?.watchIncludes || null;
  const includesExtra = product?.includes_extra || staged?.includes_extra || notes?.includesExtra || "";
  const includesDisplay = includesValue
    ? includesValue === "Ninguno"
      ? "-"
      : includesValue === "Otros"
        ? includesExtra || "Otros"
        : formatIncludesAccessories(includesValue, notes?.cuboFake === true || notes?.cuboFake === "true", notes?.cableFake === true || notes?.cableFake === "true")
    : "";
  const incluyeLegacy = notes?.incluye || {};
  const sold = item.product?.status === "sold";
  const stock = Number(product?.stock ?? staged?.stock ?? 1);
  const outOfStock = !sold && Number.isFinite(stock) && stock <= 0;
  const unavailable = sold || outOfStock;
  const stockLabel = isNewCondition(productCondition) && Number.isFinite(stock) && stock >= 2 ? `Stock: ${stock} unidades` : "";
  const visibleSpecs = especs.filter((item) => item.value);
  const productDescription = productDetails || (category === "otros" ? String(det?.descripcionOtro || notes?.descripcionOtro || "").trim() : "");
  const detailImages = uniqueStrings([
    ...(Array.isArray(notes?.detailImages) ? notes.detailImages : []),
    ...(Array.isArray(notes?.detailPhotos) ? notes.detailPhotos : []),
    ...(Array.isArray(det?.detailImages) ? det.detailImages : []),
  ]);
  const includeItems = isSealed
    ? []
    : includesDisplay
      ? [includesDisplay]
      : [
          incluyeLegacy?.caja ? "Caja" : "",
          incluyeLegacy?.cubo ? "Cubo" : "",
          incluyeLegacy?.cable ? "Cable" : "",
        ].filter(Boolean);
  const variants = Array.isArray(item.variants) ? item.variants : [];

  return (
    <div className="overflow-x-hidden px-2 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto min-w-0 max-w-7xl">
        <ProductViewTracker
          productId={productId}
          productSlug={slug}
          productTitle={title}
          category={category}
        />
        <section className="surface-card-strong soft-outline overflow-hidden px-3 py-5 sm:px-8 sm:py-10">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(340px,1.04fr)] lg:items-start lg:gap-8">
            <section className="order-1 min-w-0 overflow-hidden">
              <ProductGallery images={images} sold={sold} />
            </section>

            <aside className="order-2 min-w-0 space-y-4 sm:space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${toneForCondition(String(outOfStock ? "Agotado" : productCondition || "Disponible"), sold)}`}>
                  {sold ? "Vendido" : outOfStock ? "Agotado" : productCondition || "Disponible"}
                </span>
                {saleType && saleType !== "VENTA_SIMPLE" && (saleType !== "PROMOCION" || promoLabel) && (
                  <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white ${isPromocion ? "bg-rose-600 shadow-[0_10px_26px_rgba(225,29,72,0.28)]" : "bg-black/90"}`}>
                    {isPromocion ? promoLabel : saleType === "OFERTA" ? "Negociable" : saleType.toLowerCase()}
                  </span>
                )}
                <span className="rounded-full bg-white/78 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                  {category || "producto"}
                </span>
                {stockLabel && !sold && (
                  <span className="rounded-full bg-[rgba(230,245,236,0.92)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f6c43]">
                    {stockLabel}
                  </span>
                )}
              </div>

              <div>
                <h1 className="break-words text-2xl font-semibold text-[color:var(--foreground)] sm:text-4xl sm:tracking-[-0.06em]">
                  {title}
                </h1>
              </div>

              <div className="min-w-0 rounded-[22px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(239,244,250,0.94))] p-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)] sm:rounded-[28px] sm:p-6 sm:shadow-[0_20px_48px_rgba(15,23,42,0.1)]">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  {isPromocion && promoLabel ? promoLabel : "Precio final"}
                </div>
                <PriceWithIgv
                  price={price}
                  compareAt={compareAt}
                  wrapperClassName="mt-3"
                  rowClassName="flex flex-wrap items-center gap-3"
                  priceClassName="text-3xl font-semibold text-[color:var(--foreground)] sm:text-4xl sm:tracking-[-0.05em]"
                  labelClassName="text-xs font-semibold uppercase tracking-[0.18em] text-rose-400"
                  compareAtClassName="text-lg text-[color:var(--foreground-soft)] line-through"
                  igvClassName="mt-2 text-base font-medium text-emerald-500"
                />
                {offerApplied && isFinite(offerPrice) && (
                  <div className="mt-3 inline-flex rounded-full bg-[rgba(230,245,236,0.94)] px-3 py-1 text-sm font-medium text-[#1f6c43]">
                    Oferta aplicada
                  </div>
                )}
                {isPromocion && promoLabel && (
                  <div className="mt-4 rounded-[18px] border border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#ffe4e6)] px-4 py-3 text-rose-950 shadow-[0_14px_34px_rgba(225,29,72,0.12)]">
                    <div className="text-xs font-bold uppercase tracking-[0.22em] text-rose-700">{promoLabel}</div>
                    <div className="mt-1 text-sm font-semibold">
                      {promoLabel}. {compareAt && compareAt > price ? `Precio regular S/ ${compareAt.toFixed(2)}.` : "Precio especial por tiempo limitado."}
                    </div>
                  </div>
                )}
                <div className="mt-5">
                  <AddToCartClient
                    productId={productId}
                    saleType={saleType}
                    salePrice={salePrice}
                    disabled={!productId || unavailable}
                    disabledLabel={sold ? "Producto vendido" : outOfStock ? "Producto agotado" : undefined}
                  />
                </div>
              </div>

              {(productDescription || detailImages.length > 0) && (
                <div className="min-w-0 rounded-[22px] border border-black/6 bg-white/72 p-4 sm:rounded-[26px] sm:p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                    Descripcion
                  </div>
                  {productDescription && (
                    <div className="mt-3 whitespace-pre-line text-sm font-medium leading-6 text-[color:var(--foreground)]">
                      {productDescription}
                    </div>
                  )}
                  <ProductDetailPhotos images={detailImages} />
                </div>
              )}

              <div className="grid min-w-0 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="order-2 min-w-0 rounded-[22px] border border-black/6 bg-white/72 p-4 sm:rounded-[26px] sm:p-5 xl:order-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                    Especificaciones
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                    {visibleSpecs.length ? (
                      visibleSpecs.map((item) => (
                        <div key={item.label} className="rounded-[18px] border border-black/6 bg-[rgba(248,250,252,0.95)] px-3 py-3">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm font-medium leading-5 text-[color:var(--foreground)]">
                            {String(item.value)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-sm text-[color:var(--foreground-soft)]">No disponible.</div>
                    )}
                  </div>
                </div>

                <div className={`min-w-0 space-y-4 ${variants.length > 1 ? "order-1" : "order-3"} xl:order-2`}>
                  {variants.length > 1 && (
                    <div className="rounded-[18px] border border-black/6 bg-white/68 p-3 sm:p-4">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground-soft)]">
                        Opciones
                      </div>
                      <div className="mt-3 grid gap-1.5">
                        {variants.map((variant: any) => {
                          const activeVariant = String(variant.slug || "") === slug;
                          const availableVariant = variant?.available !== false;
                          const statusLabel = String(variant?.availabilityLabel || (availableVariant ? "Disponible" : "No disponible"));
                          const variantStock = Number(variant?.stock ?? 0);
                          const variantStockLabel = isNewCondition(variant?.condition) && Number.isFinite(variantStock) && variantStock >= 2 ? `${variantStock} unidades` : "";
                          const canOpenVariant = Boolean(variant?.slug) && !activeVariant;
                          const optionClass = `rounded-[13px] border px-3 py-2 text-xs transition ${
                            activeVariant
                              ? "border-[rgba(26,115,232,0.44)] bg-[rgba(26,115,232,0.08)] text-[color:var(--foreground)]"
                              : availableVariant
                                ? "border-black/8 bg-[rgba(248,250,252,0.92)] text-[color:var(--foreground-soft)] hover:border-black/15 hover:bg-white"
                                : "border-black/6 bg-[rgba(248,250,252,0.62)] text-[color:var(--foreground-soft)] opacity-70 hover:border-black/12 hover:bg-white/78"
                          }`;
                          const content = (
                            <>
                              <div className="flex items-center justify-between gap-3">
                                <span className={`font-medium ${availableVariant ? "" : "line-through decoration-2"}`}>
                                  {variantOptionLabel(variant)}
                                </span>
                                {!availableVariant && (
                                  <span className="shrink-0 rounded-full bg-black/8 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--foreground-soft)]">
                                    {statusLabel}
                                  </span>
                                )}
                                {availableVariant && variantStockLabel && (
                                  <span className="shrink-0 rounded-full bg-[rgba(230,245,236,0.92)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#1f6c43]">
                                    Stock: {variantStockLabel}
                                  </span>
                                )}
                              </div>
                              <PriceWithIgv
                                price={Number(variant.price || 0)}
                                wrapperClassName={`mt-1 ${availableVariant ? "" : "line-through"}`}
                                rowClassName="flex flex-wrap items-center gap-1.5"
                                priceClassName="text-[11px] font-medium text-[color:var(--foreground-soft)]"
                                labelClassName="text-[9px] font-semibold uppercase tracking-[0.1em] text-rose-400"
                                igvClassName="mt-0.5 text-[10px] text-emerald-500"
                              />
                            </>
                          );
                          if (!canOpenVariant) {
                            return (
                              <div
                                key={variant.product_id || variant.slug}
                                className={optionClass}
                                aria-current={activeVariant ? "true" : undefined}
                              >
                                {content}
                              </div>
                            );
                          }
                          return (
                            <Link
                              key={variant.product_id || variant.slug}
                              href={`/product/${variant.slug}`}
                              className={optionClass}
                            >
                              {content}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {!isSealed && (
                    <div className="rounded-[26px] border border-black/6 bg-white/72 p-4 sm:p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                        Que incluye
                      </div>
                      {includeItems.length ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {includeItems.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-black/8 bg-[rgba(248,250,252,0.95)] px-3 py-2 text-sm font-medium text-[color:var(--foreground)]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 text-sm text-[color:var(--foreground-soft)]">No disponible.</div>
                      )}
                    </div>
                  )}

                  {hasWarranty && (
                    <div className={warrantyExpired
                      ? "rounded-[26px] border border-amber-200 bg-[linear-gradient(145deg,rgba(255,251,235,0.98),rgba(254,243,199,0.92))] p-4 sm:p-5"
                      : "rounded-[26px] border border-emerald-200 bg-[linear-gradient(145deg,rgba(240,253,244,0.98),rgba(220,252,231,0.92))] p-4 sm:p-5"}>
                      <div className={warrantyExpired
                        ? "text-xs font-semibold uppercase tracking-[0.24em] text-amber-700"
                        : "text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700"}>
                        Garantía
                      </div>
                      <div className={warrantyExpired
                        ? "mt-3 text-sm font-medium leading-6 text-amber-950/80"
                        : "mt-3 text-sm font-medium leading-6 text-emerald-950/80"}>
                        {warrantyDisplay || "Con garantía"}
                      </div>
                    </div>
                  )}

                  {isPreventa && (
                    <div className="rounded-[26px] border border-amber-200 bg-[linear-gradient(145deg,rgba(255,250,236,0.98),rgba(255,243,216,0.94))] p-4 sm:p-5">
                      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Preventa</div>
                      <div className="mt-3 space-y-2 text-sm leading-6 text-amber-950/80">
                        <p>Llega entre {preventaFromLabel || "fecha por confirmar"} y {preventaToLabel || "fecha por confirmar"}.</p>
                        <p>Separacion desde S/ 50.00.</p>
                        <p>Reserva valida por 3 dias.</p>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
