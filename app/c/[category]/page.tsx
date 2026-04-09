import { listCatalog } from "@/app/actions";
import CategoryBrowser from "../../components/CategoryBrowser";

export const dynamic = "force-dynamic";

function toTitle(cat: string) {
  const m: Record<string, string> = {
    macbook: "MacBook nuevos, open box y usados",
    ipad: "iPad nuevos, open box y usados",
    iphone: "iPhone nuevos, open box y usados",
    watch: "Apple Watch nuevos, open box y usados",
    otros: "Equipos seleccionados",
    accesorios: "Accesorios",
  };
  return m[cat?.toLowerCase?.()] || cat;
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: rawCategory } = await params;
  const category = String(rawCategory || "").toLowerCase();
  const { items } = await listCatalog({ category }).catch(() => ({ items: [] as any[] }));

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong soft-outline overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="pill-chip text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
              Categoria
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-5xl lg:text-6xl">
              {toTitle(category)}
            </h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--foreground-soft)]">
              El listado ahora prioriza comparacion visual, estado del producto y precio con una jerarquia mucho mas clara.
            </p>
          </div>

          <CategoryBrowser initialItems={items} />
        </div>
      </div>
    </div>
  );
}
