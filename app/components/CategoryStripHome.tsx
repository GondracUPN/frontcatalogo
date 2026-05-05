import Image from "next/image";

const CATS = [
  { key: "macbook", label: "MacBook", href: "/c/macbook", icon: "/imagenestipos/mac.webp", note: "Trabajo y estudio." },
  { key: "iphone", label: "iPhone", href: "/c/iphone", icon: "/imagenestipos/iphone.webp", note: "Uso diario." },
  { key: "ipad", label: "iPad", href: "/c/ipad", icon: "/imagenestipos/ipad.webp", note: "Movilidad y creatividad." },
  { key: "watch", label: "Watch", href: "/c/watch", icon: "/imagenestipos/watch.webp", note: "Estilo y ecosistema." },
  { key: "accesorios", label: "Accesorios", href: "/c/accesorios", icon: "/imagenestipos/accesorios.webp", note: "Complementos clave." },
] as const;

type CategorySummary = {
  key: string;
  total: number;
  minPrice: number | null;
};

export default function CategoryStripHome({ categories }: { categories: CategorySummary[] }) {
  const summaryByKey = new Map((categories || []).map((cat) => [cat.key, cat]));
  const data = CATS.map((cat) => {
      const summary = summaryByKey.get(cat.key);
      return { ...cat, minPrice: summary?.minPrice ?? null, total: summary?.total ?? 0 };
    });

  return (
    <section className="px-3 sm:px-4">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card soft-outline overflow-hidden px-5 py-6 sm:px-7 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                Categorias
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
                Entra directo a lo que buscas.
              </h2>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {data.map((cat) => (
              <a
                key={cat.key}
                href={cat.href}
                className="group rounded-[24px] border border-black/10 bg-white/80 p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-[20px] bg-[rgba(243,246,250,0.95)] p-3">
                    <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-[18px]">
                      <Image
                        src={cat.icon}
                        alt={cat.label}
                        fill
                        sizes="64px"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[color:var(--foreground-soft)]">
                    {cat.total} items
                  </span>
                </div>

                <div className="mt-5">
                  <div className="text-xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">{cat.label}</div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--foreground-soft)]">{cat.note}</p>
                </div>

                <div className="mt-5 flex items-end justify-between gap-3 border-t border-black/6 pt-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                      Desde
                    </div>
                    <div className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                      {cat.minPrice ? `S/ ${cat.minPrice.toFixed(2)}` : "Consultar"}
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[color:var(--accent)]">Ver</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
