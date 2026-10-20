import Image from "next/image";
import Link from "next/link";
import PriceWithIgv from "./PriceWithIgv";
import type { getHomeCatalog } from "../actions";

type HomeProduct = Awaited<ReturnType<typeof getHomeCatalog>>["items"][number];

export default function HomeProductCard({ product }: { product: HomeProduct }) {
  const unit = (value: string | number | null | undefined) => value == null || value === "" ? "" : /^\d+$/.test(String(value).trim()) ? `${value}GB` : String(value);
  const specs = [product.processor, product.ram && `${unit(product.ram)} RAM`, product.storage && `${unit(product.storage)} almacenamiento`].filter(Boolean);
  const battery = [product.batteryHealth && `Batería ${product.batteryHealth}%`, product.batteryCycles && `${product.batteryCycles} ciclos`].filter(Boolean);
  const status = product.availabilityLabel || (product.stock > 0 ? "Consultar disponibilidad" : "Agotado");
  return <Link href={`/product/${product.slug}`} className="catalog-card group block rounded-[24px] border border-[color:var(--border)] bg-white p-4 transition hover:border-blue-200 hover:shadow-md">
    <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] bg-slate-50">
      <Image src={product.image || "/placeholder.svg"} alt={product.title || "Equipo"} fill sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw" className="object-contain p-4 transition duration-200 group-hover:scale-[1.02]" loading="lazy" />
      <div className="absolute left-3 top-3 flex flex-wrap gap-1"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Disponible" ? "bg-teal-50 text-teal-800" : "bg-slate-900 text-white"}`}>{status}</span>{product.condition && <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{product.condition}</span>}</div>
    </div>
    <h3 className="mt-4 line-clamp-2 text-base font-semibold leading-6">{product.title || product.slug}</h3>
    {specs.length > 0 && <p className="mt-2 text-xs leading-5 text-[color:var(--foreground-soft)]">{specs.join(" · ")}</p>}
    {battery.length > 0 && <p className="mt-1 text-xs leading-5 text-[color:var(--foreground-soft)]">{battery.join(" · ")}</p>}
    {product.hasConditionDetails && <p className="mt-2 text-xs font-medium text-amber-800">Detalles estéticos informados</p>}
    <PriceWithIgv price={Number(product.price || 0)} compareAt={product.compareAt} wrapperClassName="mt-3" />
    <span className="mt-3 inline-block text-sm font-semibold text-[color:var(--accent)]">Ver equipo →</span>
  </Link>;
}
