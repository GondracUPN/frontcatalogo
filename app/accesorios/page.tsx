import { listCatalog } from "@/app/actions";

export const dynamic = "force-dynamic";

function priceFromRow(row: any): number {
  const saleType = String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
  const salePrice = Number(row?.product?.price ?? row?.staged?.price ?? 0);
  let price = salePrice;
  try {
    const notes = row?.staged?.notes && typeof row.staged.notes === "string" ? JSON.parse(row.staged.notes) : (row.staged?.notes || {});
    const discount = Number(row?.product?.discount ?? row?.staged?.discount ?? notes?.discount ?? notes?.descuentoPorc ?? 0);
    const finalPrice = row?.product?.final_price ?? row?.staged?.final_price ?? notes?.finalPrice ?? null;
    if (saleType === "PROMOCION") {
      const computed = finalPrice !== null ? Number(finalPrice) : +(salePrice * (1 - discount / 100)).toFixed(2);
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
          return (
            <a key={row.id} href={`/product/${row.slug}`} className="rounded-xl bg-white shadow-sm border border-gray-200 p-3 block">
              <div className="aspect-square rounded-lg bg-gray-50 overflow-hidden">
                <img src={img} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="mt-3 text-sm font-medium text-gray-900 line-clamp-2">{title}</div>
              <div className="mt-2 text-sm text-gray-900 flex items-center gap-2">
                <span className="font-semibold">S/ {price.toFixed(2)}</span>
              </div>
            </a>
          );
        }) : (
          <div className="col-span-full text-center text-gray-500">Sin productos publicados aún.</div>
        )}
      </div>
    </div>
  );
}
