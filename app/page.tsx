import Image from "next/image";
import Link from "next/link";
import CategoryStripHome from "./components/CategoryStripHome";
import CategoryClientsCarousel from "./components/CategoryClientsCarousel";
import PriceWithIgv from "./components/PriceWithIgv";
import { getHomeCatalog } from "./actions";

export const revalidate = 300;

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

function isNewCondition(condition: unknown) {
  return String(condition || "").toLowerCase().includes("nuevo");
}

function promoBadge(row: { saleType?: string; promoLabel?: string; compareAt?: number | null; price?: number }) {
  if (String(row.saleType || "").toUpperCase() !== "PROMOCION") return "";
  if (row.promoLabel) return row.promoLabel;
  const compareAt = Number(row.compareAt || 0);
  const price = Number(row.price || 0);
  const savings = compareAt > price ? compareAt - price : 0;
  return savings > 0 ? `Ahorra S/ ${savings.toFixed(2)}` : "";
}

export default async function Home() {
  const { items: available, categories } = await getHomeCatalog().catch(() => ({
    items: [] as Awaited<ReturnType<typeof getHomeCatalog>>["items"],
    categories: [] as Awaited<ReturnType<typeof getHomeCatalog>>["categories"],
  }));
  return (
    <div className="space-y-10 pb-8 sm:space-y-14 sm:pb-12">
      <section className="section-shell px-3 pt-4 sm:px-4 sm:pt-6">
        <div className="mx-auto max-w-7xl">
          <div className="surface-card soft-outline overflow-hidden px-6 py-6 sm:px-8 sm:py-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Catálogo
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
                  Catálogo Macsomenos
                </h1>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/novedades"
                  className="btn-primary inline-flex items-center rounded-full bg-[color:var(--foreground)] px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 hover:bg-black"
                >
                  Últimas llegadas
                </Link>
                <Link
                  href="/categorias"
                  className="btn-secondary inline-flex items-center rounded-full border border-black/10 bg-white/70 px-6 py-3 text-sm font-medium text-[color:var(--foreground)] hover:bg-white"
                >
                  Categorias
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CategoryStripHome categories={categories} />

      <section className="deferred-section px-3 sm:px-4">
        <div className="mx-auto max-w-7xl">
          <div className="surface-card soft-outline overflow-hidden px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Novedades
                </div>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
                  Últimos ingresos.
                </h2>
              </div>
              <Link href="/novedades" className="btn-ghost text-sm font-medium text-[color:var(--accent)]">
                Ver todo el catalogo reciente
              </Link>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {available.length
                ? available.map((row) => {
                    const img = row.image || "/placeholder.svg";
                    const title = row.title || row.slug;
                    const condition = row.condition || "";
                    const isSold = false;
                    const price = Number(row.price || 0);
                    const compareAt = row.compareAt;
                    const saleType = row.saleType;
                    const stock = Number(row.stock ?? 0);
                    const stockLabel = isNewCondition(condition) && Number.isFinite(stock) && stock >= 2 ? `Stock: ${stock} unidades` : "";
                    const promoLabel = promoBadge(row);
                    const primarySpecs = [row.processor, row.ram ? `${row.ram}` : "", row.storage ? `${row.storage}` : ""].filter(Boolean).join(" · ");
                    const batterySpecs = [row.batteryHealth ? `Batería ${row.batteryHealth}%` : "", row.batteryCycles ? `${row.batteryCycles} ciclos` : ""].filter(Boolean).join(" · ");
                    return (
                      <Link
                        key={row.id}
                        href={`/product/${row.slug}`}
                        className="catalog-card group rounded-[30px] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,251,0.94))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_28px_60px_rgba(15,23,42,0.13)]"
                      >
                        <div className="relative overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#f6f8fb,#ecf0f5)]">
                          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/85 to-transparent" />
                          <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${conditionTone(condition, isSold)}`}>
                              {isSold ? "Vendido" : condition || "Disponible"}
                            </span>
                            {saleType && saleType !== "VENTA_SIMPLE" && (saleType !== "PROMOCION" || promoLabel) && (
                              <span className={`rounded-full px-3 py-1 text-[11px] font-semibold text-white ${saleType === "PROMOCION" ? "bg-rose-600 shadow-[0_8px_18px_rgba(225,29,72,0.28)]" : "bg-black/85"}`}>
                                {saleType === "PROMOCION" ? promoLabel : saleType === "OFERTA" ? "Negociable" : saleType.toLowerCase()}
                              </span>
                            )}
                            {stockLabel && (
                              <span className="rounded-full bg-[rgba(230,245,236,0.92)] px-3 py-1 text-[11px] font-semibold text-[#1f6c43]">
                                {stockLabel}
                              </span>
                            )}
                          </div>
                          <div className="relative aspect-square p-5">
                            <Image
                              src={img}
                              alt={title}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                              className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                              loading="lazy"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="text-[15px] font-semibold leading-6 text-[color:var(--foreground)] line-clamp-2">
                            {title}
                          </div>
                          {(primarySpecs || batterySpecs) && <div className="mt-2 space-y-1 text-xs font-medium leading-5 text-[color:var(--foreground-soft)]">{primarySpecs && <div>{primarySpecs}</div>}{batterySpecs && <div>{batterySpecs}</div>}</div>}
                          {row.hasConditionDetails && <div className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-900">{row.detailCount ? `${row.detailCount} ${row.detailCount === 1 ? "detalle estético" : "detalles fotografiados"}` : "Estado estético informado"}</div>}
                          <PriceWithIgv
                            price={price}
                            compareAt={compareAt}
                            wrapperClassName="mt-3"
                            priceClassName="text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]"
                          />
                        </div>
                      </Link>
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

      <section className="deferred-section px-3 sm:px-4">
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
