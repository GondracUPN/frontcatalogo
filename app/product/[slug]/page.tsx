import ProductGallery from "@/app/components/ProductGallery";
import AddToCartClient from "@/app/components/AddToCartClient";
import ProductViewTracker from "@/app/components/ProductViewTracker";
import PriceWithIgv from "@/app/components/PriceWithIgv";
import PurchaseInformation from "@/app/components/PurchaseInformation";
import UnitDetails, { type DetailRow } from "@/app/components/UnitDetails";
import ProductUnitPicker from "@/app/components/ProductUnitPicker";
import DetailHighlights from "@/app/components/DetailHighlights";
import { WAREHOUSE_MAP_URL } from "@/lib/help-content";
import WhatsAppProductLink from "@/app/components/WhatsAppProductLink";
import MobileProductAction from "@/app/components/MobileProductAction";
import { getCatalogItem, listCatalog } from "@/app/actions";
import { Suspense } from "react";
import ProductAlternatives from "@/app/components/ProductAlternatives";
import { accessoryBreakdown, categoryLabel, screenSizeLabel, badgeTone, formatRam, isUsedCondition, keyboardLabel, productBadges, publicSku } from "@/lib/catalog-display";
import { catalogPrice } from "@/lib/catalog-price";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatStorageCompact, formatStorageDisplay } from "@/lib/storage";
import { buildAppleWatchTitle } from "@/lib/watch";
import { formatWarrantyDate, warrantyStatus } from "@/lib/warranty";
import { dateInputInPeru } from "@/app/utils/peruTime";
import type { Metadata } from "next";
import ThemedSaleBadge from "@/app/components/theme/ThemedSaleBadge";

export const revalidate = 300;

// Con generateStaticParams la ficha entra en ISR: cada ficha se genera en su
// primera visita y queda en caché 5 minutos (o hasta revalidateTag). Devuelve
// [] a propósito: pre-generarlas en el build haría fallar el despliegue si la
// API tarda o no responde para alguna ficha.
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const { item } = await getCatalogItem(slug).catch(() => ({ item: null as any }));
  if (!item) return { title: "Equipo no disponible", robots: { index: false } };
  const title = String(item.product?.title || item.staged?.title || "Equipo Apple");
  const description = `Consulta fotografías, condición, características y precio de ${title} en Macsomenos.`;
  const url = `/product/${item.slug || slug}`;
  // Una unidad vendida o reservada no se ofrece en buscadores; su URL sigue
  // abriendo (enlaces compartidos) con alternativas disponibles.
  const notForSale = item.availability === "sold" || item.availability === "reserved";
  return { title, description, alternates: { canonical: url }, ...(notForSale ? { robots: { index: false, follow: true } } : {}), openGraph: { title, description, url, images: item.images?.[0] ? [{ url: item.images[0] }] : undefined } };
}

function parseNotes(notes: any) {
  try {
    return typeof notes === "string" ? JSON.parse(notes) : notes || {};
  } catch {
    return {};
  }
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

const NOT_RECORDED = "No registrado";

function isNewCondition(condition: unknown) {
  return String(condition || "").toLowerCase().includes("nuevo");
}

function variantOptionLabel(variant: any) {
  const batteryHealth = variant?.batteryHealth ?? variant?.battery_health ?? variant?.bateria?.salud;
  const includes = String(variant?.includes || "").trim();
  const pieces = [
    variant?.color,
    variant?.condition,
    variant?.ram ? `${formatRam(variant.ram)} RAM` : "",
    variant?.storage ? `${formatStorageDisplay(variant.storage)} almacenamiento` : "",
    batteryHealth ? `${batteryHealth}% batería` : "",
    variant?.batteryCycles ? `${variant.batteryCycles} ciclos` : "",
    includes && includes !== "Ninguno" ? includes : "",
  ].filter(Boolean);
  return String(pieces.join(" · ") || variant?.variantLabel || variant?.title || "Opción");
}

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

// La ficha no lee `searchParams`: así Next la genera una vez y la sirve desde
// caché (ISR, 5 minutos) en lugar de renderizarla en cada visita.
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // El listado para «También te puede interesar» se pide a la vez que la ficha:
  // la página en caché (ISR) espera a ambos, y en serie sumaban dos viajes a la API.
  // Es el catálogo completo, una sola entrada de caché compartida por todas las fichas.
  const catalogPromise = listCatalog().catch(() => null);
  let item: any;
  try {
    ({ item } = await getCatalogItem(slug));
  } catch (error) {
    if (error instanceof Error && /\/catalog\/.* 404\b/.test(error.message)) notFound();
    throw new Error("El catálogo no está disponible temporalmente.");
  }
  if (!item) notFound();
  // Slug antiguo (sufijo -svc-N): redirige al vigente. Una página en caché no
  // conoce la query de cada visita, por eso esa redirección ya no la conserva.
  if (item.slug && item.slug !== slug) redirect(`/product/${item.slug}`);

  const images: string[] = Array.isArray(item.images) && item.images.length ? item.images : Array.isArray(item.staged?.images) ? item.staged.images : [];
  const category = String(item.category || item.staged?.category || item.product?.category || "").toLowerCase();
  const titleFallback: string = item.product?.title || item.staged?.title || item.slug;
  const productId: string = item.product?.id || item.product_id || "";
  const notes = parseNotes(item.staged?.notes);
  const product = item.product || {};
  const staged = item.staged || {};
  const salePrice = Number(product?.price ?? staged?.price ?? 0);
  const { price, compareAt, saleType, promoLabel } = catalogPrice(item);
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

  const colorRaw = notes?.color ? String(notes.color) : product?.color || staged?.color || "";
  const colorCap = colorRaw ? colorRaw.charAt(0).toUpperCase() + colorRaw.slice(1) : "";

  const ramVal = formatRam(det?.ram);
  const almVal = formatStorageDisplay(det?.almacenamiento);

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
  const preventaFromRaw = notes?.preventaDateFrom || notes?.preventa?.from || "";
  const preventaToRaw = notes?.preventaDateTo || notes?.preventa?.to || "";
  const preventaFromLabel = formatSpanishDate(preventaFromRaw);
  const preventaToLabel = formatSpanishDate(preventaToRaw);
  const preventaEndDay = String(preventaToRaw || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
  const preventaDateExpired = Boolean(preventaEndDay && preventaEndDay < dateInputInPeru());
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
  const tecladoLabel = keyboardLabel(teclado);
  const productCondition = product?.product_condition || staged?.product_condition || notes?.productCondition || notes?.estado || notes?.specs?.estado || "";
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
  const hasWarranty = warrantyFlag ?? Boolean(String(rawWarrantyValue || warrantyType || "").trim());
  const warrantyExpired = hasWarranty && warrantyStatus(rawWarrantyValue) === "expired";
  const warrantyDetail = formatWarrantyValue(rawWarrantyValue);
  const warrantyDisplay = warrantyExpired
    ? `Garantía Vencida: ${formatWarrantyDate(rawWarrantyValue)}`
    : hasWarranty ? [warrantyType, warrantyDetail].filter(Boolean).join(" · ") : "";
  const hasAppleWarranty = hasWarranty && /apple/i.test(`${warrantyType} ${warrantyDisplay}`);
  const title = baseTitle;

  // En equipos usados u Open Box la batería es un dato clave: si falta, se
  // indica «No registrado» en lugar de ocultarlo. Lo que no aplica se oculta.
  const usedUnit = isUsedCondition(productCondition);
  const batteryApplies = usedUnit && ["macbook", "ipad", "iphone"].includes(category);
  // iOS muestra los ciclos desde el iPhone 15; en modelos anteriores no aplica.
  const cyclesApply = batteryApplies && (category !== "iphone" || Number(iphoneNumber) >= 15);
  const keyValue = (value: unknown, applies: boolean) => (String(value ?? "").trim() ? value : applies ? NOT_RECORDED : "");
  const healthLabel = String(batteryHealth ?? "").trim() ? `${String(batteryHealth).replace(/%$/, "")}%` : "";
  const especs: Array<{ label: string; value: any }> = [];
  if (productCondition) especs.push({ label: "Estado", value: productCondition });
  // Mac mini / iMac antiguos se guardaron con categoría "otros"; el tipo real quedó en specs.tipo.
  const desktopKind = category === "macmini" || category === "imac" ? category
    : category === "otros" && /mac\s*mini/i.test(String(specsAny?.tipo || "")) ? "macmini"
    : category === "otros" && /\bimac\b/i.test(String(specsAny?.tipo || "")) ? "imac"
    : "";
  if (category === "macbook") {
    especs.push(
      { label: "Gama", value: gama },
      { label: "Procesador", value: proc },
      { label: "RAM", value: ramVal },
      { label: "SSD", value: almVal },
      { label: "Pantalla", value: screenSizeLabel(category, tamPantalla) },
      { label: "Ciclos de batería", value: keyValue(batteryCycles, cyclesApply) },
      { label: "Salud de batería", value: keyValue(healthLabel, batteryApplies) },
      { label: "Color", value: colorCap },
      // El aviso de la «ñ» va en el propio dato, no como advertencia aparte.
      { label: "Teclado", value: /ingl/i.test(tecladoLabel) ? "Inglés (sin la tecla ñ impresa)" : tecladoLabel },
    );
  } else if (desktopKind) {
    // La variante guardada es "chip-cpu-gpu" (p. ej. m2pro-10-16).
    const cores = String(notes?.desktopVariant || det?.modeloHardware || "").match(/-(\d+)-(\d+)$/)
      || String(titleFallback).match(/CPU\s*(\d+)\s*\/\s*GPU\s*(\d+)/i);
    especs.push(
      { label: "Procesador", value: proc },
      { label: "Núcleos", value: cores ? `CPU ${cores[1]} / GPU ${cores[2]}` : "" },
      { label: "RAM", value: ramVal },
      { label: "Almacenamiento", value: almVal },
      { label: "Pantalla", value: desktopKind === "imac" && tamPantalla ? `${String(tamPantalla).replace(/["”]$/, "")}"` : "" },
      { label: "Color", value: colorCap },
    );
  } else if (category === "ipad") {
    especs.push(
      { label: "Procesador", value: proc },
      { label: "Gama", value: gama },
      { label: "Pantalla", value: screenSizeLabel(category, tamPantalla) },
      { label: "Almacenamiento", value: almVal },
      { label: "Conectividad", value: conectividad },
      { label: "Ciclos de batería", value: keyValue(batteryCycles, cyclesApply) },
      { label: "Salud de batería", value: keyValue(healthLabel, batteryApplies) },
      { label: "Color", value: colorCap },
    );
  } else if (category === "iphone") {
    especs.push(
      { label: "SIM", value: iphoneSimType },
      { label: "Versión", value: iphoneModel },
      { label: "Número", value: iphoneNumber },
      { label: "Almacenamiento", value: formatStorageDisplay(storageGb) },
      { label: "Ciclos de batería", value: keyValue(batteryCycles, cyclesApply) },
      { label: "Salud de batería", value: keyValue(healthLabel, batteryApplies) },
      { label: "Color", value: colorCap },
    );
  } else if (category === "watch") {
    especs.push(
      { label: "Tipo", value: watchType },
      { label: "Serie", value: watchType === "Normal" ? watchSeries : "" },
      { label: "Versión", value: watchType === "Ultra" ? watchVersion : "" },
      { label: "Tamaño", value: watchSize ? `${String(watchSize).replace(/\s*mm$/i, "")} mm` : "" },
      { label: "Conexión", value: watchConnection },
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
  const incluyeLegacy = notes?.incluye || {};
  const sold = item.product?.status === "sold" || item.staged?.status === "sold";
  const stock = Number(product?.stock ?? staged?.stock ?? 0);
  const outOfStock = !sold && Number.isFinite(stock) && stock <= 0;
  const stockLabel = isNewCondition(productCondition) && Number.isFinite(stock) && stock >= 2 ? `Stock: ${stock} unidades` : "";
  const visibleSpecs = especs.filter((item) => item.value);
  // `descripcionOtro` describe el tipo/modelo de productos de la categoría
  // "otros"; no es una observación estética. Mostrarlo aquí hacía aparecer
  // el bloque "Estado verificado" aunque la casilla de detalles estuviera apagada.
  const productDescription = productDetails;
  const detailImages = uniqueStrings([
    ...(Array.isArray(notes?.detailImages) ? notes.detailImages : []),
    ...(Array.isArray(notes?.detailPhotos) ? notes.detailPhotos : []),
    ...(Array.isArray(det?.detailImages) ? det.detailImages : []),
  ]);
  const accessories = accessoryBreakdown({
    category,
    includes: includesValue,
    includesExtra,
    legacy: incluyeLegacy,
    cuboGeneric: notes?.cuboFake === true || notes?.cuboFake === "true",
    cableGeneric: notes?.cableFake === true || notes?.cableFake === "true",
  });
  const variants = Array.isArray(item.variants) ? item.variants : [];
  // Línea que distingue esta unidad de otra del mismo modelo.
  const unitSummary = [
    category === "iphone" ? "" : [proc, ramVal && `${ramVal} RAM`, almVal].filter(Boolean).join(" · "),
    category !== "iphone" && !title.toLowerCase().includes(colorCap.toLowerCase()) ? colorCap : "",
    usedUnit && healthLabel ? `Batería ${healthLabel}` : "",
  ].filter(Boolean).join(" · ");
  // Avisos que no figuran en otro lugar de la ficha. El teclado inglés, la falta
  // de cargador y la batería sin registrar ya se ven en sus propios datos.
  const preventaArrival = preventaDateExpired
    ? "La fecha estimada publicada ya pasó: consulta el estado actual antes de solicitar."
    : preventaFromLabel && preventaToLabel ? `Llegada estimada entre el ${preventaFromLabel} y el ${preventaToLabel}.` : "Fecha de llegada por confirmar.";
  const beforeRequest = [
    category === "iphone" && iphoneSimType === "eSIM" ? "Funciona con eSIM: confirma con tu operador que pueda activarla." : "",
    isPreventa ? `Preventa: ${preventaArrival} Las fotos son referenciales hasta que llegue la unidad; consulta las condiciones de separación antes de solicitar.` : "",
  ].filter(Boolean);
  // Disponibilidad pública (calculada en el backend: vendido, reservado, preventa).
  const availability: string = String(item.availability || (sold ? "sold" : outOfStock ? "sold" : isPreventa ? "preorder" : "available"));
  const notForSale = availability === "sold" || availability === "reserved";
  const sku = publicSku(product?.sku || staged?.sku || notes?.manualSku || notes?.sourceSku);
  const allUnits = variants.filter((variant: any) => variant?.slug);
  // Fotos de detalles tal como las ordena la galería (después de las del equipo).
  const galleryPrimaryCount = images.filter(Boolean).length;
  const galleryDetailImages = detailImages.filter((src) => !images.includes(src));
  // En una unidad vendida o reservada solo se ofrecen las demás.
  const units = notForSale ? allUnits.filter((variant: any) => variant.slug !== (item.slug || slug)) : allUnits;
  const structuredProduct = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    image: images,
    sku: product?.sku || staged?.sku || undefined,
    description: productDescription || undefined,
    url: `https://www.macsomenos.com/product/${encodeURIComponent(item.slug || slug)}`,
  };

  // Observaciones: el texto registrado, separado en frases cuando trae varias líneas.
  const observations = productDescription
    ? productDescription.split(/\n+|;\s*/).map((text) => text.trim()).filter(Boolean).map((text) => `${text.charAt(0).toLocaleUpperCase("es")}${text.slice(1)}`)
    : [];
  // Accesorios: un único lugar (junto al precio). En usados u Open Box, si no
  // están registrados se dice, porque cambia la decisión de compra.
  const accessoriesText = accessories.known
    ? accessories.included.length
      ? `Incluye ${accessories.included.join(", ").toLowerCase()}.${accessories.missing.length ? ` No incluye ${accessories.missing.join(", ").toLowerCase()}.` : ""}`
      : "Solo el equipo, sin accesorios."
    : usedUnit && category !== "otros" ? "No registrados: consúltalos antes de solicitar." : "";

  // Especificaciones: solo datos registrados del modelo y la configuración.
  const specRows: DetailRow[] = [
    { label: "Modelo", value: baseShownTitle },
    ...visibleSpecs.filter((spec) => !["Estado", "SKU", "Ciclos de batería", "Salud de batería"].includes(spec.label)),
  ]
    .map((spec) => ({ label: spec.label, value: String(spec.value ?? "").trim() }))
    .filter((spec) => spec.value);

  // Estado de la unidad: condición, batería (si aplica) y garantía registrada.
  // «Nuevo» no implica «sellado»: solo se muestra la presentación registrada en el panel.
  const presentationRaw = String(product?.presentation || staged?.presentation || "").toLowerCase();
  const presentationLabel = isNewCondition(productCondition) && presentationRaw === "sellado" ? "Sellado" : isNewCondition(productCondition) && presentationRaw === "abierto" ? "Abierto" : "";
  const cyclesText = cyclesApply && String(batteryCycles ?? "").trim() ? `${batteryCycles} ciclos` : "";
  const conditionRows: DetailRow[] = ([
    productCondition ? { label: "Estado", value: String(productCondition) } : null,
    presentationLabel ? { label: "Presentación", value: presentationLabel } : null,
    batteryApplies
      ? healthLabel
        ? { label: "Batería", value: [`${healthLabel} de salud`, cyclesText].filter(Boolean).join(" · ") }
        : { label: "Batería", value: NOT_RECORDED, muted: true, note: "Pídela por WhatsApp antes de solicitar." }
      : null,
    // En un usado, saber que no hay detalles registrados también ayuda a decidir.
    usedUnit && !observations.length && !detailImages.length ? { label: "Estética", value: "Sin observaciones registradas" } : null,
    hasWarranty ? { label: hasAppleWarranty && !warrantyExpired ? "Garantía de Apple" : "Garantía", value: (warrantyDisplay || "Con garantía").replace(/^Garantía limitada de Apple\s*·\s*/i, "") } : null,
  ] as Array<DetailRow | null>).filter((row): row is DetailRow => Boolean(row && row.value));
  const badges = productBadges({ condition: productCondition, saleType, promoLabel, availability });

  return (
    <div className="route-enter overflow-x-clip px-2 pb-28 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto min-w-0 max-w-7xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredProduct).replace(/</g, "\\u003c") }} />
        <nav aria-label="Ruta de navegación" className="mb-4 px-2 text-sm text-[color:var(--foreground-soft)]"><Link href="/">Inicio</Link><span aria-hidden="true"> / </span><Link href={`/c/${category || "otros"}`}>{categoryLabel(category)}</Link><span aria-hidden="true"> / </span><span aria-current="page">{title}</span></nav>
        <ProductViewTracker
          productId={productId}
          productSlug={slug}
          productTitle={title}
          category={category}
        />

        {/* NIVEL A: lo necesario para decidir y solicitar. En móvil: nombre, fotos y compra. */}
        <section className="surface-card-strong soft-outline overflow-clip px-3 py-5 sm:px-8 sm:py-8">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:grid-rows-[auto_1fr] lg:gap-x-10 lg:gap-y-5">
            <header className="min-w-0 lg:col-start-2 lg:row-start-1">
              <div className="flex flex-wrap items-center gap-2">
                {badges.map((badge) =>
                  badge.kind === "promo" ? <ThemedSaleBadge key={badge.kind} label={badge.label} />
                  : <span key={badge.kind} className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${badgeTone(badge)}`}>{badge.label}</span>)}
                {stockLabel && !notForSale && <span className="text-xs font-semibold text-[#1f6c43]">{stockLabel}</span>}
                {sku && <span className="text-xs font-medium text-[color:var(--foreground-soft)]">SKU {sku}</span>}
              </div>
              <h1 className="mt-3 break-words text-[26px] font-semibold leading-tight tracking-[-0.03em] text-[color:var(--foreground)] sm:text-4xl sm:tracking-[-0.05em]">
                {title}
              </h1>
              {unitSummary && <p className="mt-1.5 text-base font-medium text-[color:var(--foreground-soft)]">{unitSummary}</p>}
            </header>

            <div id="galeria" className="min-w-0 scroll-mt-24 lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:self-start">
              <ProductGallery images={images} detailImages={detailImages} sold={availability === "sold"} />
            </div>

            <div className="min-w-0 space-y-5 lg:col-start-2 lg:row-start-2">
              {notForSale ? (
                <div role="status" className="rounded-[20px] bg-slate-900 p-5 text-white">
                  <p className="text-lg font-semibold">{availability === "sold" ? "Este equipo ya se vendió." : "Este equipo está reservado."}</p>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    {availability === "sold"
                      ? "Ya no se puede solicitar. Te mostramos otras unidades y equipos disponibles."
                      : "Tiene una solicitud en curso y por ahora no se puede solicitar. Si se libera, volverá a estar disponible."}
                  </p>
                </div>
              ) : (
                <div>
                  <PriceWithIgv
                    price={price}
                    compareAt={compareAt}
                    rowClassName="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                    labelClassName="text-xs font-semibold uppercase tracking-[0.16em] text-red-600"
                    compareAtClassName="text-base text-[color:var(--foreground-soft)] line-through"
                    igvClassName="mt-2"
                    priceClassName="text-3xl font-bold tracking-[-0.04em] text-emerald-600 sm:text-[34px]"
                  />
                </div>
              )}

              {accessoriesText && (
                <p className="text-sm leading-6">
                  <span className="font-semibold text-[color:var(--foreground)]">Accesorios: </span>
                  <span className={accessories.known ? "text-[color:var(--foreground-soft)]" : "italic text-[color:var(--foreground-soft)]"}>{accessoriesText}</span>
                </p>
              )}

              {!notForSale && (
                <DetailHighlights photoCount={galleryDetailImages.length} observations={observations} />
              )}

              {beforeRequest.length > 0 && !notForSale && (
                <ul className={`space-y-1 rounded-[14px] px-4 py-3 text-sm leading-6 ${isPreventa ? "bg-[color:var(--brand-tint)] text-[color:var(--foreground)] ring-1 ring-inset ring-[rgba(37,99,235,0.3)]" : "bg-[color:var(--brand-tint)] text-[color:var(--foreground)]"}`}>
                  {beforeRequest.map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}

              {notForSale && <ProductUnitPicker units={units} minUnits={1} currentSlug={item.slug || slug} showMemory={category !== "watch" && category !== "otros"} heading="Unidades disponibles de este modelo" />}

              {!notForSale && (
                <div id="product-action" className="scroll-mt-28">
                  <AddToCartClient
                    productId={productId}
                    saleType={saleType}
                    salePrice={salePrice}
                    disabled={!productId}
                  />
                  <div className="mt-3"><WhatsAppProductLink productId={productId} title={title} sku={product?.sku || staged?.sku} slug={item.slug || slug} price={price} condition={productCondition} variant={variantOptionLabel({ color: colorCap, ram: ramVal, storage: almVal || formatStorageDisplay(storageGb), batteryHealth, batteryCycles })} /></div>
                </div>
              )}

              {!notForSale && (
                <ul className="grid gap-1.5 border-t border-[color:var(--border)] pt-4 text-sm text-[color:var(--foreground-soft)]">
                  <li>Solicitas sin pagar: confirmamos la disponibilidad por WhatsApp.</li>
                  <li>Recojo siempre gratis en nuestro almacén de Surco (<a href={WAREHOUSE_MAP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--accent-strong)] hover:underline">ver ubicación</a>) o entrega en centros comerciales de Lima, con costo a confirmar.</li>
                  <li><a href="#condiciones" className="font-semibold text-[color:var(--accent-strong)] hover:underline">Garantía, pagos y entregas</a></li>
                </ul>
              )}

              {/* Las demás unidades del modelo van al final: primero la que el cliente está viendo. */}
              {!notForSale && units.length >= 2 && (
                <div className="border-t border-[color:var(--border)] pt-5">
                  <ProductUnitPicker units={units} currentSlug={item.slug || slug} showMemory={category !== "watch" && category !== "otros"} heading="Otras unidades de este modelo" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* NIVEL B: ficha completa de esta unidad (se adapta a lo registrado). */}
        <UnitDetails specs={specRows} condition={conditionRows} photoCount={galleryPrimaryCount + galleryDetailImages.length} />

        {/* Condiciones generales de la tienda (la garantía de esta unidad ya figura en sus características). */}
        <div id="condiciones" className="mt-6 scroll-mt-24">
          <PurchaseInformation category={category} />
        </div>

        {category && <Suspense fallback={null}><ProductAlternatives item={item} category={category} catalog={catalogPromise} excludeSlugs={allUnits.map((variant: any) => String(variant.slug))} /></Suspense>}
      </div>
      {!notForSale && <MobileProductAction price={price} unavailable={false} isPreventa={isPreventa} />}
    </div>
  );
}
