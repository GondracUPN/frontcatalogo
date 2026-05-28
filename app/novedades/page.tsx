import Image from "next/image";
import { listCatalog } from "../actions";
import PriceWithIgv from "../components/PriceWithIgv";

export const revalidate = 300;

function priceFromRow(row: any): { price: number; compareAt: number | null; promoLabel: string } {
  const saleType = String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
  const salePrice = Number(row?.product?.price ?? row?.staged?.price ?? 0);
  let price = salePrice;
  let compareAt: number | null = null;
  let promoLabel = "";
  try {
    const notes = row?.staged?.notes && typeof row.staged.notes === "string" ? JSON.parse(row.staged.notes) : row.staged?.notes || {};
    const discount = Number(row?.product?.discount ?? row?.staged?.discount ?? notes?.discount ?? notes?.descuentoPorc ?? 0);
    const finalPrice = row?.product?.final_price ?? row?.staged?.final_price ?? notes?.finalPrice ?? null;
    if (saleType === "PROMOCION") {
      const mode = String(notes?.discountMode || notes?.discountType || "percent").toLowerCase();
      const computed = finalPrice !== null ? Number(finalPrice) : +(mode === "amount" ? Math.max(0, salePrice - discount) : salePrice * (1 - discount / 100)).toFixed(2);
      if (isFinite(computed) && computed > 0) price = computed;
      compareAt = salePrice || null;
      const savings = compareAt && compareAt > price ? compareAt - price : 0;
      promoLabel = mode === "amount" && discount > 0
        ? `Ahorra S/ ${discount.toFixed(2)}`
        : discount > 0
          ? `${discount}% OFF`
          : savings > 0
            ? `Ahorra S/ ${savings.toFixed(2)}`
            : "";
      return { price: price || 0, compareAt, promoLabel };
    }
    if (!saleType && typeof notes?.precioLista !== "undefined") {
      const p = Number(notes?.precioLista || 0);
      const d = Number(notes?.descuentoPorc || 0);
      const f = +(p * (1 - d / 100)).toFixed(2);
      compareAt = p || null;
      if (isFinite(f) && f > 0) price = f;
    }
  } catch {}
  return { price: price || 0, compareAt, promoLabel };
}

function conditionFromRow(row: any) {
  try {
    const notes = row?.staged?.notes && typeof row.staged.notes === "string" ? JSON.parse(row.staged.notes) : row.staged?.notes || {};
    return String(row?.product?.product_condition || row?.staged?.product_condition || notes?.productCondition || notes?.estado || "");
  } catch {
    return String(row?.product?.product_condition || row?.staged?.product_condition || "");
  }
}

function isNewCondition(condition: unknown) {
  return String(condition || "").toLowerCase().includes("nuevo");
}

export default async function NovedadesPage() {
  const { items } = await listCatalog().catch(() => ({ items: [] as any[] }));
  const availableItems = (items || []).filter((row: any) => row?.product?.status !== "sold");
  const sortedAvailable = [...availableItems].sort(
    (a: any, b: any) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
  );
  const visibleItems = sortedAvailable;

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong soft-outline overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="pill-chip text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
              Novedades
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-5xl">
              Ultimos ingresos publicados.
            </h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--foreground-soft)]">
              Se mantienen visibles hasta que nuevos productos los vayan reemplazando.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {visibleItems.length ? (
              visibleItems.map((row: any) => {
                const img = (row.images && row.images[0]) || row.staged?.images?.[0] || "/placeholder.svg";
                const title: string = row.product?.title || row.staged?.title || row.slug;
                const saleType = String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
                const { price, compareAt, promoLabel } = priceFromRow(row);
                const stock = Number(row?.product?.stock ?? row?.staged?.stock ?? 0);
                const stockLabel = isNewCondition(conditionFromRow(row)) && Number.isFinite(stock) && stock >= 2 ? `Stock: ${stock} unidades` : "";
                return (
                  <a
                    key={row.id}
                    href={`/product/${row.slug}`}
                    className="group rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.94))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                  >
                    <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#f5f7fa,#ebf0f6)]">
                      {stockLabel && (
                        <div className="absolute left-3 top-3 z-10 rounded-full bg-[rgba(230,245,236,0.92)] px-3 py-1 text-[11px] font-semibold text-[#1f6c43]">
                          {stockLabel}
                        </div>
                      )}
                      {saleType === "PROMOCION" && promoLabel && (
                        <div className={`absolute ${stockLabel ? "left-3 top-12" : "left-3 top-3"} z-10 rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white shadow-[0_8px_18px_rgba(225,29,72,0.28)]`}>
                          {promoLabel}
                        </div>
                      )}
                      <div className="relative aspect-[4/3] p-5">
                        <Image
                          src={img}
                          alt={title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                    <div className="mt-4 text-lg font-semibold leading-6 tracking-[-0.03em] text-[color:var(--foreground)] line-clamp-2">
                      {title}
                    </div>
                    <PriceWithIgv price={Number(price)} compareAt={compareAt} wrapperClassName="mt-3" />
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
