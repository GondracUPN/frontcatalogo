import Image from "next/image";
import { getHomeCatalog } from "../actions";

export const revalidate = 300;

const CATS = [
  { key: "macbook", label: "MacBook", href: "/c/macbook", icon: "/imagenestipos/mac.webp", note: "Trabajo y estudio." },
  { key: "iphone", label: "iPhone", href: "/c/iphone", icon: "/imagenestipos/iphone.webp", note: "Uso diario." },
  { key: "ipad", label: "iPad", href: "/c/ipad", icon: "/imagenestipos/ipad.webp", note: "Movilidad y creatividad." },
  { key: "watch", label: "Watch", href: "/c/watch", icon: "/imagenestipos/watch.webp", note: "Estilo y ecosistema." },
  { key: "accesorios", label: "Accesorios", href: "/c/accesorios", icon: "/imagenestipos/accesorios.webp", note: "Complementos clave." },
] as const;

export default async function CategoriasPage() {
  const { categories } = await getHomeCatalog().catch(() => ({
    categories: [] as Array<{ key: string; total: number; minPrice: number | null }>,
  }));
  const summaryByKey = new Map((categories || []).map((cat) => [cat.key, cat]));
  const data = CATS.map((cat) => {
    const summary = summaryByKey.get(cat.key);
    return { ...cat, minPrice: summary?.minPrice ?? null, total: summary?.total ?? 0 };
  });

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
    </div>
  );
}
