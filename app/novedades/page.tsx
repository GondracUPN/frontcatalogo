import { listCatalog } from "../actions";

export const dynamic = "force-dynamic";

function withinDays(d: string | Date, days = 14) {
  const t = new Date(d).getTime();
  const now = Date.now();
  return now - t <= days * 24 * 60 * 60 * 1000;
}

function priceFromRow(row: any): { price: number; compareAt: number | null } {
  const saleType = String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
  const salePrice = Number(row?.product?.price ?? row?.staged?.price ?? 0);
  let price = salePrice;
  let compareAt: number | null = null;
  try {
    const notes = row?.staged?.notes && typeof row.staged.notes === "string" ? JSON.parse(row.staged.notes) : row.staged?.notes || {};
    const discount = Number(row?.product?.discount ?? row?.staged?.discount ?? notes?.discount ?? notes?.descuentoPorc ?? 0);
    const finalPrice = row?.product?.final_price ?? row?.staged?.final_price ?? notes?.finalPrice ?? null;
    if (saleType === "PROMOCION") {
      const computed = finalPrice !== null ? Number(finalPrice) : +(salePrice * (1 - discount / 100)).toFixed(2);
      if (isFinite(computed) && computed > 0) price = computed;
      compareAt = salePrice || null;
      return { price: price || 0, compareAt };
    }
    if (!saleType && typeof notes?.precioLista !== "undefined") {
      const p = Number(notes?.precioLista || 0);
      const d = Number(notes?.descuentoPorc || 0);
      const f = +(p * (1 - d / 100)).toFixed(2);
      compareAt = p || null;
      if (isFinite(f) && f > 0) price = f;
    }
  } catch {}
  return { price: price || 0, compareAt };
}

export default async function NovedadesPage() {
  const { items } = await listCatalog().catch(() => ({ items: [] as any[] }));
  const availableItems = (items || []).filter((row: any) => row?.product?.status !== "sold");
  const sortedAvailable = [...availableItems].sort(
    (a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
  );
  const recent = sortedAvailable.filter((r: any) => withinDays(r.created_at, 14));
  const visibleItems = recent.length ? recent : sortedAvailable;

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong soft-outline overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="pill-chip text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
              Novedades
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-5xl">
              Productos publicados en las ultimas 2 semanas.
            </h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--foreground-soft)]">
              Muestra los ingresos recientes o, si no hay nuevos este mes, los ultimos publicados.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleItems.length ? (
              visibleItems.map((row: any) => {
                const img = (row.images && row.images[0]) || row.staged?.images?.[0] || "/placeholder.svg";
                const title: string = row.product?.title || row.staged?.title || row.slug;
                const { price, compareAt } = priceFromRow(row);
                return (
                  <a
                    key={row.id}
                    href={`/product/${row.slug}`}
                    className="group rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.94))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                  >
                    <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#f5f7fa,#ebf0f6)]">
                      <div className="aspect-[4/3] p-5">
                        <img src={img} alt={title} className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]" />
                      </div>
                    </div>
                    <div className="mt-4 text-lg font-semibold leading-6 tracking-[-0.03em] text-[color:var(--foreground)] line-clamp-2">
                      {title}
                    </div>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">S/ {Number(price).toFixed(2)}</span>
                      {compareAt && compareAt > price && (
                        <span className="text-sm text-[color:var(--foreground-soft)] line-through">S/ {compareAt.toFixed(2)}</span>
                      )}
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="col-span-full rounded-[28px] border border-dashed border-black/12 bg-white/60 px-6 py-14 text-center text-sm text-[color:var(--foreground-soft)]">
                No hay novedades todavia.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
