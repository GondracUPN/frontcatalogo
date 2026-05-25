import Image from "next/image";
import { listCatalog } from "@/app/actions";
import PriceWithIgv from "@/app/components/PriceWithIgv";

export const revalidate = 300;

function priceFromRow(row: any): number {
  const saleType = String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
  const salePrice = Number(row?.product?.price ?? row?.staged?.price ?? 0);
  let price = salePrice;
  try {
    const notes = row?.staged?.notes && typeof row.staged.notes === "string" ? JSON.parse(row.staged.notes) : (row.staged?.notes || {});
    const discount = Number(row?.product?.discount ?? row?.staged?.discount ?? notes?.discount ?? notes?.descuentoPorc ?? 0);
    const finalPrice = row?.product?.final_price ?? row?.staged?.final_price ?? notes?.finalPrice ?? null;
    if (saleType === "PROMOCION") {
      const mode = String(notes?.discountMode || notes?.discountType || "percent").toLowerCase();
      const computed = finalPrice !== null ? Number(finalPrice) : +(mode === "amount" ? Math.max(0, salePrice - discount) : salePrice * (1 - discount / 100)).toFixed(2);
      if (isFinite(computed) && computed > 0) price = computed;
      return price || 0;
    }
    if (!saleType && typeof notes?.precioLista !== "undefined") {
      const p = Number(notes?.precioLista || 0);
      const d = Number(notes?.descuentoPorc || 0);
      const f = +(p * (1 - d / 100)).toFixed(2);
      if (isFinite(f) && f > 0) price = f;
    }
  } catch {}
  return price || 0;
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

export default async function AccesoriosPage() {
  const { items } = await listCatalog({ category: 'accesorios' }).catch(() => ({ items: [] as any[] }));
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Accesorios</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {items.length ? items.map((row: any) => {
          const img = (row.images && row.images[0]) || row.staged?.images?.[0] || "/placeholder.svg";
          const title: string = row.product?.title || row.staged?.title || row.slug;
          const price: number = priceFromRow(row);
          const stock = Number(row?.product?.stock ?? row?.staged?.stock ?? 0);
          const stockLabel = isNewCondition(conditionFromRow(row)) && Number.isFinite(stock) && stock > 0 ? `Stock: ${stock} ${stock === 1 ? "unidad" : "unidades"}` : "";
          return (
            <a key={row.id} href={`/product/${row.slug}`} className="rounded-xl bg-white shadow-sm border border-gray-200 p-3 block">
              <div className="relative aspect-square rounded-lg bg-gray-50 overflow-hidden">
                {stockLabel && (
                  <div className="absolute left-2 top-2 z-10 rounded-full bg-[rgba(230,245,236,0.92)] px-2.5 py-1 text-[10px] font-semibold text-[#1f6c43]">
                    {stockLabel}
                  </div>
                )}
                <Image
                  src={img}
                  alt={title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="mt-3 text-sm font-medium text-gray-900 line-clamp-2">{title}</div>
              <PriceWithIgv
                price={price}
                wrapperClassName="mt-2"
                priceClassName="text-sm font-semibold text-gray-900"
                labelClassName="text-[10px] font-semibold uppercase tracking-[0.12em] text-rose-400"
                igvClassName="mt-1 text-xs font-medium text-emerald-500"
              />
            </a>
          );
        }) : (
          <div className="col-span-full text-center text-gray-500">Sin productos publicados aún.</div>
        )}
      </div>
    </div>
  );
}
