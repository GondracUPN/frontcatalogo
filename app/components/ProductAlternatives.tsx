import Image from "next/image";
import Link from "next/link";
import { listCatalog } from "@/app/actions";
import { pickAlternatives } from "@/lib/alternatives";
import { formatSoles, withIgv } from "@/lib/catalog-price";

export default async function ProductAlternatives({ item, category, excludeSlugs }: { item: any; category: string; excludeSlugs: string[] }) {
  const catalog = await listCatalog({ category }).catch(() => null);
  const alternatives = pickAlternatives(item, catalog?.items || [], excludeSlugs);
  if (!alternatives.length) return null;
  return <section aria-labelledby="alternatives-title" className="mt-10 px-1">
    <h2 id="alternatives-title" className="text-2xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">También te puede interesar</h2>
    <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">{alternatives.map(alt => <li key={alt.slug}>
      <Link href={`/product/${alt.slug}`} className="ms-store-card flex h-full flex-col rounded-[22px] bg-white p-3 sm:p-4">
        <span className="relative block aspect-[4/3] overflow-hidden rounded-[16px] bg-[color:var(--surface-muted)]"><Image src={alt.image} alt="" fill sizes="(max-width: 1024px) 45vw, 280px" className="object-contain" /></span>
        <span className="mt-3 text-xs font-semibold text-[color:var(--accent-strong)]">{alt.reason}</span>
        <span className="mt-0.5 font-semibold leading-5 text-[color:var(--foreground)]">{alt.title}</span>
        <span className="mt-1 text-[13px] leading-5 text-[color:var(--foreground-soft)]">{[alt.specs, alt.condition].filter(Boolean).join(" · ")}</span>
        <span className="mt-auto pt-2 text-base font-bold text-[color:var(--foreground)]">{formatSoles(withIgv(alt.price))} <span className="text-xs font-medium text-[color:var(--foreground-soft)]">con IGV</span></span>
      </Link>
    </li>)}</ul>
  </section>;
}
