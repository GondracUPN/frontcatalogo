import { listCatalog } from "@/app/actions";
import CategoryBrowser from "../../components/CategoryBrowser";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { isBuildPhase, listingRows } from "@/lib/catalog-listing";

export const revalidate = 300;

const CATEGORY_PARAMS = ["macbook", "macmini", "imac", "ipad", "iphone", "watch", "airpods", "otros", "accesorios"] as const;

export function generateStaticParams() {
  return CATEGORY_PARAMS.map((category) => ({ category }));
}

function toTitle(cat: string) {
  const m: Record<string, string> = {
    macbook: "MacBook nuevos, open box y usados",
    macmini: "Mac mini nuevos, open box y usados",
    imac: "iMac nuevos, open box y usados",
    ipad: "iPad nuevos, open box y usados",
    iphone: "iPhone nuevos, open box y usados",
    watch: "Apple Watch nuevos, open box y usados",
    airpods: "AirPods nuevos, open box y usados",
    otros: "Otros productos",
    accesorios: "Accesorios",
  };
  return m[cat?.toLowerCase?.()] || cat;
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const title = toTitle(category);
  return {
    title,
    description: `Explora ${title.toLowerCase()} en Macsomenos. Consulta fotografías, condición y precio total antes de solicitar un equipo.`,
    alternates: { canonical: `/c/${category}` },
    openGraph: { title, url: `/c/${category}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: rawCategory } = await params;
  const category = String(rawCategory || "").toLowerCase();
  if (category === "accesorios") redirect("/c/otros");
  let catalogUnavailable = false;
  let items: any[] = [];
  try {
    items = listingRows((await listCatalog({ category })).items);
  } catch (error) {
    if (!isBuildPhase()) throw error;
    catalogUnavailable = true;
  }

  return (
    <div className="route-enter px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Ruta de navegación" className="mb-3 px-1 text-sm sm:mb-4 sm:px-2 text-[color:var(--foreground-soft)]"><Link href="/">Inicio</Link><span aria-hidden="true"> / </span><span aria-current="page">{toTitle(category)}</span></nav>
        <div className="catalog-flat surface-card-strong soft-outline overflow-clip px-3 py-6 sm:px-8 sm:py-10">
          <div className="max-w-3xl px-1 sm:px-0">
            <div className="hidden sm:block">
              <div className="pill-chip text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
                Categoría
              </div>
            </div>
            <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.04em] text-[color:var(--foreground)] sm:mt-5 sm:text-5xl sm:tracking-[-0.06em] lg:text-6xl">
              {toTitle(category)}
            </h1>
          </div>

          {catalogUnavailable ? <div role="alert" className="mt-8 rounded-2xl bg-slate-50 p-6 text-sm">El catálogo no está disponible temporalmente. Intenta de nuevo más tarde.</div> : <CategoryBrowser initialItems={items} category={category} />}
        </div>
      </div>
    </div>
  );
}
