import ProductGallery from "@/app/components/ProductGallery";
import AddToCartClient from "@/app/components/AddToCartClient";
import ProductViewTracker from "@/app/components/ProductViewTracker";
import { getCatalogItem } from "@/app/actions";

export const dynamic = "force-dynamic";

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
  const s = storageGb ? String(storageGb).trim() : "";
  const c = color ? String(color).trim() : "";
  if (!n || !m || !s || !c) return "";
  const cap = c.charAt(0).toUpperCase() + c.slice(1);
  return `iPhone ${n} ${m} ${s}GB ${cap}`.trim();
}

function formatSpanishDate(dateValue?: string | null) {
  const raw = String(dateValue || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const parts = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value || String(d.getDate());
  const month = parts.find((p) => p.type === "month")?.value || "";
  const year = parts.find((p) => p.type === "year")?.value || String(d.getFullYear());
  return `${day} de ${month} del ${year}`.trim();
}

function toneForCondition(condition: string, sold?: boolean) {
  if (sold) return "bg-[rgba(15,23,42,0.92)] text-white";
  const value = condition.toLowerCase();
  if (value.includes("nuevo")) return "bg-[rgba(230,245,236,0.94)] text-[#1f6c43]";
  if (value.includes("open")) return "bg-[rgba(255,242,214,0.96)] text-[#8a5b11]";
  if (value.includes("usad")) return "bg-[rgba(231,239,255,0.96)] text-[#305fbe]";
  return "bg-white/88 text-[color:var(--foreground-soft)]";
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
    const computed = finalPrice !== null ? Number(finalPrice) : +(salePrice * (1 - discount / 100)).toFixed(2);
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
  const iphoneTitle = category === "iphone" ? buildIphoneTitle(iphoneNumber, iphoneModel, storageGb, colorCap) : "";
  const isPreventa = saleType === "PREVENTA";
  const preventaFromRaw = notes?.preventaDateFrom || notes?.preventa?.from || "";
  const preventaToRaw = notes?.preventaDateTo || notes?.preventa?.to || "";
  const preventaFromLabel = formatSpanishDate(preventaFromRaw);
  const preventaToLabel = formatSpanishDate(preventaToRaw);
  const baseShownTitle = iphoneTitle || titleFallback;
  const title = isPreventa ? (/^preventa\s+/i.test(baseShownTitle) ? baseShownTitle : `Preventa ${baseShownTitle}`.trim()) : baseShownTitle;
  const tecladoLabel = teclado === "Ingles" ? "Ingles" : teclado === "Espanol" ? "Espanol" : teclado;

  const conectividad = det?.conectividad || notes?.conectividad || "";
  const gama = det?.gama || "";
  const watchType = notes?.watchType || "";
  const watchSeries = notes?.watchSeries || "";
  const watchVersion = notes?.watchVersion || "";
  const watchConnection = notes?.watchConnection || "";
  const watchAccessories = notes?.watchAccessories || "";
  const productCondition = product?.product_condition || staged?.product_condition || notes?.productCondition || notes?.estado || notes?.specs?.estado || "";

  const especs: Array<{ label: string; value: any }> = [];
  if (productCondition) especs.push({ label: "Estado", value: productCondition });
  if (category === "macbook") {
    especs.push(
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
      { label: "Modelo", value: iphoneModel },
      { label: "Numero", value: iphoneNumber },
      { label: "Almacenamiento", value: storageGb ? `${storageGb} GB` : "" },
      { label: "Ciclos", value: batteryCycles },
      { label: "Salud bateria", value: batteryHealth ? `${batteryHealth}%` : "" },
      { label: "Color", value: colorCap },
    );
  } else if (category === "watch") {
    especs.push(
      { label: "Tipo", value: watchType },
      { label: "Serie", value: watchType === "Normal" ? watchSeries : "" },
      { label: "Version", value: watchType === "Ultra" ? watchVersion : "" },
      { label: "Conexion", value: watchConnection },
      { label: "Accesorios", value: watchAccessories },
      { label: "Color", value: colorCap },
    );
  } else {
    const desc = det?.descripcionOtro || notes?.descripcionOtro || "";
    especs.push(
      { label: "Descripcion", value: desc },
      { label: "Color", value: colorCap }
    );
  }

  const includesValue = product?.includes || staged?.includes || notes?.includes || notes?.watchIncludes || null;
  const includesExtra = product?.includes_extra || staged?.includes_extra || notes?.includesExtra || "";
  const includesDisplay = includesValue ? (includesValue === "Otros" ? includesExtra || "Otros" : includesValue) : "";
  const incluyeLegacy = notes?.incluye || {};
  const sold = item.product?.status === "sold";
  const visibleSpecs = especs.filter((item) => item.value);
  const includeItems = includesDisplay
    ? [includesDisplay]
    : [
        incluyeLegacy?.caja ? "Caja" : "",
        incluyeLegacy?.cubo ? "Cubo" : "",
        incluyeLegacy?.cable ? "Cable" : "",
      ].filter(Boolean);

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <ProductViewTracker
          productId={productId}
          productSlug={slug}
          productTitle={title}
          category={category}
        />
        <section className="surface-card-strong soft-outline overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(340px,1.04fr)] lg:items-start lg:gap-8">
            <section className="order-1">
              <ProductGallery images={images} sold={sold} />
            </section>

            <aside className="order-2 space-y-4 sm:space-y-5">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${toneForCondition(String(productCondition || "Disponible"), sold)}`}>
                  {sold ? "Vendido" : productCondition || "Disponible"}
                </span>
                {saleType && saleType !== "VENTA_SIMPLE" && (
                  <span className="rounded-full bg-black/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                    {saleType.toLowerCase()}
                  </span>
                )}
                <span className="rounded-full bg-white/78 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                  {category || "producto"}
                </span>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-4xl">
                  {title}
                </h1>
              </div>

              <div className="rounded-[28px] border border-white/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(239,244,250,0.94))] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.1)] sm:p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Precio final
                </div>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
                    S/ {price.toFixed(2)}
                  </div>
                  {compareAt && compareAt > price && (
                    <div className="pb-1 text-lg text-[color:var(--foreground-soft)] line-through">S/ {compareAt.toFixed(2)}</div>
                  )}
                </div>
                {offerApplied && isFinite(offerPrice) && (
                  <div className="mt-3 inline-flex rounded-full bg-[rgba(230,245,236,0.94)] px-3 py-1 text-sm font-medium text-[#1f6c43]">
                    Oferta aplicada
                  </div>
                )}
                <div className="mt-5">
                  <AddToCartClient
                    productId={productId}
                    saleType={saleType}
                    salePrice={salePrice}
                    disabled={!productId || sold}
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[26px] border border-black/6 bg-white/72 p-4 sm:p-5">
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

                <div className="space-y-4">
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
