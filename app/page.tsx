import CategoryStripHome from "./components/CategoryStripHome";
import CategoryClientsCarousel from "./components/CategoryClientsCarousel";
import { listCatalog } from "./actions";

export const dynamic = "force-dynamic";

function withinDays(d: string | Date, days = 14) {
  const t = new Date(d).getTime();
  const now = Date.now();
  return now - t <= days * 24 * 60 * 60 * 1000;
}

function parseNotes(row: any) {
  try {
    return row?.staged?.notes && typeof row.staged.notes === "string"
      ? JSON.parse(row.staged.notes)
      : row?.staged?.notes || {};
  } catch {
    return {};
  }
}

function priceMeta(row: any) {
  const isSold = row?.product?.status === "sold";
  const notes = parseNotes(row);
  const saleType = String(row?.product?.sale_type || row?.staged?.sale_type || notes?.saleType || "").toUpperCase();
  const salePrice = Number(row?.product?.price ?? row?.staged?.price ?? 0);
  const discount = Number(row?.product?.discount ?? row?.staged?.discount ?? notes?.discount ?? notes?.descuentoPorc ?? 0);
  const finalPrice = row?.product?.final_price ?? row?.staged?.final_price ?? notes?.finalPrice ?? null;
  let price = isSold ? 0 : salePrice;
  let compareAt: number | null = null;

  if (saleType === "PROMOCION") {
    const computed = finalPrice !== null ? Number(finalPrice) : +(salePrice * (1 - discount / 100)).toFixed(2);
    if (isFinite(computed) && computed > 0) price = computed;
    compareAt = salePrice || null;
  } else if (!saleType && typeof notes?.precioLista !== "undefined") {
    compareAt = notes?.precioLista ? Number(notes.precioLista) : null;
    if ((!price || price <= 0) && typeof notes?.precioLista !== "undefined") {
      const p = Number(notes?.precioLista || 0);
      const d = Number(notes?.descuentoPorc || 0);
      const f = +(p * (1 - d / 100)).toFixed(2);
      if (isFinite(f) && f > 0) price = f;
    }
  }

  const condition = String(
    row?.product?.product_condition ||
      row?.staged?.product_condition ||
      notes?.productCondition ||
      notes?.estado ||
      ""
  );

  return { condition, saleType, isSold, price, compareAt };
}

function conditionTone(condition: string, isSold: boolean) {
  if (isSold) {
    return "bg-[rgba(15,23,42,0.9)] text-white";
  }

  const value = condition.toLowerCase();
  if (value.includes("nuevo")) return "bg-[rgba(230,245,236,0.92)] text-[#1f6c43]";
  if (value.includes("open")) return "bg-[rgba(255,242,214,0.96)] text-[#8a5b11]";
  if (value.includes("usad")) return "bg-[rgba(231,239,255,0.96)] text-[#305fbe]";
  return "bg-white/85 text-[color:var(--foreground-soft)]";
}

export default async function Home() {
  const { items } = await listCatalog().catch(() => ({ items: [] as any[] }));
  const availableItems = (items || []).filter((row: any) => row?.product?.status !== "sold");
  const sortedAvailable = [...availableItems].sort(
    (a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
  );
  const recentItems = sortedAvailable.filter((row: any) => withinDays(row?.created_at, 14));
  const available = (recentItems.length ? recentItems : sortedAvailable).slice(0, 8);
  return (
    <div className="space-y-10 pb-8 sm:space-y-14 sm:pb-12">
      <section className="section-shell px-3 pt-4 sm:px-4 sm:pt-6">
        <div className="mx-auto max-w-7xl">
          <div className="surface-card soft-outline overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Catalogo
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
                  Catalogo Macsomenos
                </h1>
              </div>

              <div className="flex flex-wrap gap-3">
                <a
                  href="/novedades"
                  className="btn-primary inline-flex items-center rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 hover:bg-black"
                >
                  Ultimas llegadas
                </a>
                <a
                  href="/categorias"
                  className="btn-secondary inline-flex items-center rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-medium text-[color:var(--foreground)] hover:bg-white"
                >
                  Categorias
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CategoryStripHome />

      <section className="px-3 sm:px-4">
        <div className="mx-auto max-w-7xl">
          <div className="surface-card soft-outline overflow-hidden px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Novedades
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
                  Ultimos ingresos.
                </h2>
              </div>
              <a href="/novedades" className="btn-ghost text-sm font-medium text-[color:var(--accent)]">
                Ver todo el catalogo reciente
              </a>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {available.length
                ? available.map((row: any) => {
                    const img = (row.images && row.images[0]) || row.staged?.images?.[0] || "/placeholder.svg";
                    const title: string = row.product?.title || row.staged?.title || row.slug;
                    const { condition, isSold, price, compareAt, saleType } = priceMeta(row);
                    return (
                      <a
                        key={row.id}
                        href={`/product/${row.slug}`}
                        className="group rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,251,0.94))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.13)]"
                      >
                        <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#f6f8fb,#ecf0f5)]">
                          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/85 to-transparent" />
                          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${conditionTone(condition, isSold)}`}>
                              {isSold ? "Vendido" : condition || "Disponible"}
                            </span>
                            {saleType && saleType !== "VENTA_SIMPLE" && (
                              <span className="rounded-full bg-black/85 px-3 py-1 text-[11px] font-semibold text-white">
                                {saleType.toLowerCase()}
                              </span>
                            )}
                          </div>
                          <div className="aspect-square p-5">
                            <img src={img} alt={title} className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="text-[15px] font-semibold leading-6 text-[color:var(--foreground)] line-clamp-2">
                            {title}
                          </div>
                          <div className="mt-3 flex items-end gap-2">
                            <span className="text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                              S/ {price.toFixed(2)}
                            </span>
                            {compareAt && compareAt > price && (
                              <span className="text-sm text-[color:var(--foreground-soft)] line-through">
                                S/ {compareAt.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })
                : Array.from({ length: 4 }).map((_, i) => (
                    <article key={i} className="rounded-[30px] border border-white/75 bg-white/90 p-4 shadow-sm">
                      <div className="aspect-square rounded-[24px] bg-[linear-gradient(145deg,#f3f5f7,#e6ebf1)]" />
                      <div className="mt-4 h-4 w-2/3 rounded-full bg-slate-200" />
                      <div className="mt-3 h-6 w-1/3 rounded-full bg-slate-100" />
                    </article>
                  ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-3 sm:px-4">
        <div className="mx-auto max-w-7xl">
          <div className="surface-card soft-outline px-6 py-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Clientes
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)]">
                  Equipos entregados.
                </h2>
              </div>
            </div>
            <div className="mt-7">
              <CategoryClientsCarousel />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
