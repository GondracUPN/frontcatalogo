import { listCatalog } from "@/app/actions";
import CategoryBrowser from "../../components/CategoryBrowser";
import type { Metadata } from "next";
import Link from "next/link";
import { isBuildPhase, listingRows } from "@/lib/catalog-listing";
import { categorySeo } from "@/lib/category-seo";

export const revalidate = 300;
// Categorías desconocidas responden 404 real (antes 200 indexable = soft 404 en Search Console).
export const dynamicParams = false;

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
  const { category: rawCategory } = await params;
  const category = String(rawCategory || "").toLowerCase();
  const seo = categorySeo(category, toTitle(category));
  // Una categoría sin equipos es una página vacía: Google la trata como soft 404.
  // listCatalog usa la caché de fetch, así que no duplica la llamada de la página.
  const empty = await listCatalog({ category }).then(({ items }) => listingRows(items).length === 0).catch(() => false);
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: `/c/${category}` },
    ...(empty ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: seo.title, description: seo.description, url: `/c/${category}` },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: rawCategory } = await params;
  const category = String(rawCategory || "").toLowerCase();
  let catalogUnavailable = false;
  let items: any[] = [];
  try {
    items = listingRows((await listCatalog({ category })).items);
  } catch (error) {
    if (!isBuildPhase()) throw error;
    catalogUnavailable = true;
  }

  const seo = categorySeo(category, toTitle(category));
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://www.macsomenos.com/" },
      { "@type": "ListItem", position: 2, name: toTitle(category), item: `https://www.macsomenos.com/c/${category}` },
    ],
  };

  return (
    <div className="route-enter px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }} />
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
            <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-[color:var(--foreground-soft)] sm:mt-4 sm:text-[17px]">{seo.intro}</p>
          </div>

          {catalogUnavailable ? <div role="alert" className="mt-8 rounded-2xl bg-slate-50 p-6 text-sm">El catálogo no está disponible temporalmente. Intenta de nuevo más tarde.</div> : <CategoryBrowser initialItems={items} category={category} />}
        </div>
      </div>
    </div>
  );
}
