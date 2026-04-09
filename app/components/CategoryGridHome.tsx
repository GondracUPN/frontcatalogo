import { listCatalog } from "@/app/actions";

const CATS = ["macbook", "ipad", "iphone", "watch", "otros", "accesorios"] as const;
const LABEL: Record<string, string> = { macbook: "MacBook", ipad: "iPad", iphone: "iPhone", watch: "Watch", otros: "Otros", accesorios: "Accesorios" };

export default async function CategoryGridHome() {
  const byCat = await Promise.all(
    CATS.map(async (c) => {
      const { items } = await listCatalog({ category: c }).catch(() => ({ items: [] as any[] }));
      const latest = items && items.length ? items[items.length - 1] : null; // por categoría: más reciente al final (ASC)
      const img = latest ? ((latest.images && latest.images[0]) || latest.staged?.images?.[0] || "/placeholder.svg") : "/placeholder.svg";
      return { cat: c, img };
    })
  );

  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {byCat.map(({ cat, img }) => (
        <a key={cat} href={`/c/${cat}`} className="rounded-2xl bg-[#e6f7a8] border border-gray-200 p-4 block hover:shadow-md transition">
          <div className="aspect-[16/10] rounded-lg overflow-hidden">
            <img src={img} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="mt-3 text-[15px] font-semibold text-gray-900">{LABEL[cat]}</div>
        </a>
      ))}
    </div>
  );
}

