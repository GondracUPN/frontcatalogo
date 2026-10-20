import type { Metadata } from "next";
import { getCatalogComparison } from "../actions";
import ComparisonPageClient from "../components/ComparisonPageClient";

export const metadata: Metadata = { title: "Comparar equipos", robots: { index: false, follow: true } };
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ items?: string }> }) {
  const { items = "" } = await searchParams;
  const slugs = Array.from(new Set(items.split(",").map(slug => slug.trim()).filter(Boolean))).slice(0, 3);
  let products: any[] = [], failed = false;
  try { if (slugs.length) products = (await getCatalogComparison(slugs)).items; } catch { failed = true; }
  return <div className="mx-auto max-w-7xl px-3 py-8 sm:px-4"><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Comparar equipos</h1><p className="mt-2 text-sm text-[color:var(--foreground-soft)]">La configuración, condición y disponibilidad de cada unidad, en un solo lugar.</p>{failed ? <p role="alert" className="py-8 text-sm">No pudimos actualizar los equipos. Vuelve a cargar la página.</p> : <ComparisonPageClient key={slugs.join("|")} initialItems={products} />}</div>;
}
