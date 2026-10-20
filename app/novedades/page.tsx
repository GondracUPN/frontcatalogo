import Image from "next/image";
import type { Metadata } from "next";
import { catalogPrice } from "@/lib/catalog-price";
import Link from "next/link";
import { listCatalog } from "../actions";
import PriceWithIgv from "../components/PriceWithIgv";
import { catalogFacts, compactSpecs, detailCountLabel } from "@/lib/catalog-display";
import ThemedSaleBadge from "../components/theme/ThemedSaleBadge";

export const revalidate = 300;
export const metadata: Metadata = { title: "Novedades", description: "Descubre los equipos incorporados recientemente al catálogo de Macsomenos.", alternates: { canonical: "/novedades" } };

function priceFromRow(row: any): { price: number; compareAt: number | null; promoLabel: string } {
  const { price, compareAt, promoLabel } = catalogPrice(row);
  return { price, compareAt, promoLabel };
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
  const visibleItems = availableItems;

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong soft-outline overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="pill-chip text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
              Novedades
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-5xl">
              Últimos ingresos publicados.
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
                const facts = catalogFacts(row);
                const specLines = compactSpecs(facts);
                const aestheticLabel = detailCountLabel(facts.detailImages.length, Boolean(facts.conditionDescription));
                return (
                  <Link
                    key={row.id}
                    href={`/product/${row.slug}`}
                    className="catalog-card group rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,251,0.94))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                  >
                    <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#f5f7fa,#ebf0f6)]">
                      {stockLabel && (
                        <div className="absolute left-3 top-3 z-10 rounded-full bg-[rgba(230,245,236,0.92)] px-3 py-1 text-[11px] font-semibold text-[#1f6c43]">
                          {stockLabel}
                        </div>
                      )}
                      {saleType === "PROMOCION" && promoLabel && (
                        <div className={`absolute ${stockLabel ? "left-3 top-12" : "left-3 top-3"} z-10`}>
                          <ThemedSaleBadge label={promoLabel} size="sm" />
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
                    {specLines.length > 0 && <div className="mt-2 space-y-1 text-xs font-medium leading-5 text-[color:var(--foreground-soft)]">{specLines.map((line) => <div key={line}>{line}</div>)}</div>}
                    {aestheticLabel && <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900">{aestheticLabel}</div>}
                    <PriceWithIgv price={Number(price)} compareAt={compareAt} wrapperClassName="mt-3" />
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full rounded-[28px] border border-dashed border-black/12 bg-white/60 px-6 py-14 text-center text-sm text-[color:var(--foreground-soft)]">
                No hay novedades todavía.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
