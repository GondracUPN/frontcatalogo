import Image from "next/image";
import { listCatalog } from "../actions";
import PriceWithIgv from "../components/PriceWithIgv";

export const revalidate = 300;

function saleTypeFromRow(row: any) {
  try {
    const notes = row?.staged?.notes && typeof row.staged.notes === "string"
      ? JSON.parse(row.staged.notes)
      : row?.staged?.notes || {};
    return String(row?.product?.sale_type || row?.staged?.sale_type || notes?.saleType || "").toUpperCase();
  } catch {
    return String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
  }
}

function priceFromRow(row: any) {
  return Number(row?.product?.price ?? row?.staged?.price ?? 0) || 0;
}

export default async function ProximosPage() {
  const { items } = await listCatalog().catch(() => ({ items: [] as any[] }));
  const preventas = (items || [])
    .filter((row: any) => row?.product?.status !== "sold" && saleTypeFromRow(row) === "PREVENTA");

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong soft-outline overflow-hidden px-5 py-7 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="pill-chip text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
              Próximos
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-5xl">
              Productos en camino.
            </h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--foreground-soft)]">
              Equipos disponibles para separar antes de su llegada.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {preventas.length ? (
              preventas.map((row: any) => {
                const img = (row.images && row.images[0]) || row.staged?.images?.[0] || "/placeholder.svg";
                const title = String(row.product?.title || row.staged?.title || row.slug || "Producto");
                return (
                  <a
                    key={row.id}
                    href={`/product/${row.slug}`}
                    className="group rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.94))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                  >
                    <div className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(145deg,#f5f7fa,#ebf0f6)]">
                      <span className="absolute left-3 top-3 z-10 rounded-full bg-black/85 px-3 py-1 text-[11px] font-semibold text-white">
                        preventa
                      </span>
                      <div className="relative aspect-[4/3] p-5">
                        <Image
                          src={img}
                          alt={title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                        />
                      </div>
                    </div>
                    <div className="mt-4 text-lg font-semibold leading-6 tracking-[-0.03em] text-[color:var(--foreground)] line-clamp-2">
                      {title}
                    </div>
                    <PriceWithIgv price={priceFromRow(row)} wrapperClassName="mt-3" />
                  </a>
                );
              })
            ) : (
              <div className="col-span-full rounded-[28px] border border-dashed border-black/12 bg-white/60 px-6 py-14 text-center text-sm text-[color:var(--foreground-soft)]">
                No hay productos en preventa por el momento.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
