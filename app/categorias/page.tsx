import { listCatalog } from "../actions";

export const dynamic = "force-dynamic";

const CATS = ["macbook", "ipad", "iphone", "watch", "otros", "accesorios"] as const;
const LABEL: Record<string, string> = {
  macbook: "MacBook",
  ipad: "iPad",
  iphone: "iPhone",
  watch: "Watch",
  otros: "Open box y usados",
  accesorios: "Accesorios",
};

export default async function CategoriasPage() {
  const byCat = await Promise.all(
    CATS.map(async (c) => {
      const { items } = await listCatalog({ category: c }).catch(() => ({ items: [] as any[] }));
      const latest = items && items.length ? items[items.length - 1] : null;
      const img = latest ? (latest.images && latest.images[0]) || latest.staged?.images?.[0] || "/placeholder.svg" : "/placeholder.svg";
      return { cat: c, img };
    })
  );

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong soft-outline overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="pill-chip text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--foreground-soft)]">
              Categorias
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-5xl">
              Explora el catalogo por familia.
            </h1>
            <p className="mt-4 text-base leading-7 text-[color:var(--foreground-soft)]">
              Las categorias ahora se sienten mas cercanas a una vitrina premium y no a una cuadricula generica.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {byCat.map(({ cat, img }) => (
              <a
                key={cat}
                href={`/c/${cat}`}
                className="group rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,250,0.94))] p-4 shadow-[0_18px_42px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
              >
                <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(145deg,#f5f7fa,#e8edf3)]">
                  <div className="aspect-[16/10] p-4">
                    <img src={img} alt={LABEL[cat]} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
                  </div>
                </div>
                <div className="mt-4 text-xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">{LABEL[cat]}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
