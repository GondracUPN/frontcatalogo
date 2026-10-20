import type { Metadata } from "next";
import { listCatalog } from "../actions";
import CategoryBrowser from "../components/CategoryBrowser";
import { listingRows } from "@/lib/catalog-listing";

export const metadata: Metadata = {
  title: "Buscar equipos",
  description: "Busca equipos Apple y filtra el catálogo de Macsomenos.",
  robots: { index: false, follow: true },
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = String(q).slice(0, 120);
  let catalogUnavailable = false;
  const { items } = await listCatalog().catch(() => { catalogUnavailable = true; return { items: [] as any[] }; });
  return <div className="px-3 pb-10 pt-4 sm:px-4 sm:pt-6"><div className="surface-card-strong mx-auto max-w-7xl p-5 sm:p-8"><h1 className="text-3xl font-bold tracking-tight">Buscar equipos</h1><p className="mt-2 text-sm text-[color:var(--foreground-soft)]">Escribe el modelo, chip, memoria o color. Por ejemplo: «MacBook Air M4», «16/512» o «iPhone 15 128GB».</p>{catalogUnavailable ? <div role="alert" className="mt-6 rounded-2xl bg-slate-50 p-6 text-sm">El catálogo no está disponible temporalmente. Intenta de nuevo más tarde.</div> : <CategoryBrowser initialItems={listingRows(items)} initialQuery={query} autoFocusSearch />}</div></div>;
}
