import Image from "next/image";
import Link from "next/link";
import { getClientPurchases, getHomeCatalog } from "./actions";
import { ClientDeliveriesHome } from "./components/ClientDeliveries";
import { FaqEntry } from "./preguntas-frecuentes/FaqBrowser";
import { FAQ_ITEMS, HOME_FAQ_IDS } from "@/lib/help-content";
import HomeViewTracker from "./components/HomeViewTracker";
import CampaignHero from "./components/campaign/CampaignHero";
import type { HeroProduct } from "./components/campaign/parts";
import StoreShelf from "./components/home/StoreShelf";
import HeroVitrina, { type VitrinaUnit } from "./components/home/HeroVitrina";
import StoreProductCard, { StoreFeatureCard, batteryLine, specLine, type StoreUnit } from "./components/home/StoreProductCard";
import Reveal from "./components/home/Reveal";
import { BrandHeading, LeafMark } from "./components/home/BrandBits";
import GoogleReviews from "./components/home/GoogleReviews";
import { CATEGORY_LABELS } from "@/lib/catalog-display";
import { formatSoles, withIgv } from "@/lib/catalog-price";
import WhatsAppIcon from "./components/WhatsAppIcon";
import { WHATSAPP_DISPLAY, whatsappUrl } from "@/lib/store-config";

export const revalidate = 300;

type HomeRow = Awaited<ReturnType<typeof getHomeCatalog>>["items"][number];

const CATEGORY_ROW = [
  { key: "macbook", icon: "/imagenestipos/mac.webp" },
  { key: "iphone", icon: "/imagenestipos/iphone.webp" },
  { key: "ipad", icon: "/imagenestipos/ipad.webp" },
  { key: "watch", icon: "/imagenestipos/watch.webp" },
  { key: "otros", icon: "/imagenestipos/accesorios.webp" },
];

// Datos reales de la tienda (página de contacto e información de compra).
const WAREHOUSE = "Jr. Ganimedes 245, Surco";
const WAREHOUSE_MAP = "https://maps.app.goo.gl/ttGMLJEKx4LEwNet6";

const STEPS = [
  ["Eliges tu equipo", "Revisa sus fotos, su batería, su condición y el precio total con IGV."],
  ["Envías tu solicitud", "Lo agregas al carrito y nos dejas tu nombre y teléfono. No pagas nada en la web."],
  ["Te escribimos por WhatsApp", "Confirmamos que siga disponible y coordinamos el pago."],
  ["Lo recibes", "Recojo gratis en nuestro almacén de Surco o entrega en un centro comercial de Lima."],
];


function toUnit(row: HomeRow): StoreUnit {
  return {
    slug: row.slug,
    title: row.title,
    image: row.image,
    condition: row.condition,
    availabilityLabel: row.availabilityLabel,
    processor: row.processor,
    ram: row.ram,
    storage: row.storage,
    batteryHealth: row.batteryHealth,
    batteryCycles: row.batteryCycles,
    price: Number(row.price || 0),
    compareAt: row.compareAt,
    promoLabel: row.promoLabel,
  };
}


export default async function Home() {
  let catalogUnavailable = false;
  const clientPurchasesPromise = getClientPurchases();
  const { items: available, featured, promotions, categories, budgets } = await getHomeCatalog().catch(() => {
    catalogUnavailable = true;
    return {
      items: [] as HomeRow[],
      promotions: [] as HomeRow[],
      featured: [] as Awaited<ReturnType<typeof getHomeCatalog>>["featured"],
      categories: [] as Awaited<ReturnType<typeof getHomeCatalog>>["categories"],
      budgets: [] as Awaited<ReturnType<typeof getHomeCatalog>>["budgets"],
    };
  });
  const featuredUnits = (featured || []).filter((row) => row.image).map((row) => toUnit(row as HomeRow));
  const featuredSlugs = new Set(featuredUnits.map((unit) => unit.slug));
  const latest = available.filter((row) => !featuredSlugs.has(row.slug)).slice(0, 8);
  const latestUnits = (latest.length ? latest : available.slice(0, 8)).map(toUnit);
  const categoryRow = CATEGORY_ROW
    .map((cat) => ({ ...cat, total: 0, minPrice: null as number | null, ...categories.find((summary) => summary.key === cat.key) }))
    .filter((cat) => catalogUnavailable || cat.total > 0);
  // Datos reales para la composición de campaña (solo lo necesario para el cliente).
  const toHero = (row: { slug: string; title: string; image: string; category: string | null; condition: string; price: number; compareAt: number | null }): HeroProduct => ({
    slug: row.slug, title: row.title, image: row.image, category: row.category, condition: row.condition, price: Number(row.price || 0), compareAt: row.compareAt,
  });
  const heroProducts = [...(featured || []), ...available].filter((row) => row.image).slice(0, 8).map(toHero);
  const heroPromotions = (promotions ?? []).filter((row) => row.image).map(toHero);
  const clientPurchases = await clientPurchasesPromise;
  // Protagonista del hero: el destacado con más fotos publicadas (ficha más
  // completa); a igualdad, el orden del backend. Nada aleatorio, así no cambia
  // entre servidor y navegador. Sin inventario con foto, se muestra el logo.
  const heroSlug = [...(featured || [])]
    .filter((row) => row.image)
    .map((row, index) => ({ slug: row.slug, photos: row.images?.length || 1, index }))
    .sort((a, b) => b.photos - a.photos || a.index - b.index)[0]?.slug;
  const heroUnit = featuredUnits.find((unit) => unit.slug === heroSlug) || latestUnits.find((unit) => unit.image) || null;
  // Vitrina: el protagonista y hasta dos unidades más, de otras categorías si
  // las hay. Todas son unidades reales y publicadas, con su propia foto.
  const vitrinaRows: HomeRow[] = [];
  // Solo unidades vendibles con foto propia: si un destacado se vende o se queda
  // sin stock, la vitrina toma la siguiente unidad válida (featured, luego recientes).
  const pool = ([...(featured || []), ...available] as HomeRow[]).filter((row) => row.image && Number(row.stock) > 0 && row.status !== "sold");
  const mainRow = pool.find((row) => row.slug === heroUnit?.slug);
  if (mainRow) vitrinaRows.push(mainRow);
  for (const row of pool) {
    if (vitrinaRows.length >= 3) break;
    if (vitrinaRows.some((picked) => picked.slug === row.slug || picked.category === row.category)) continue;
    vitrinaRows.push(row);
  }
  for (const row of pool) {
    if (vitrinaRows.length >= 3) break;
    if (!vitrinaRows.some((picked) => picked.slug === row.slug)) vitrinaRows.push(row);
  }
  const vitrina: VitrinaUnit[] = vitrinaRows.map((row) => {
    const unit = toUnit(row);
    return { slug: row.slug, title: row.title, image: row.image, condition: row.condition, saleType: row.saleType, detail: (/usad|open/i.test(row.condition) && batteryLine(unit)) || specLine(unit), price: Number(row.price || 0), compareAt: row.compareAt };
  });
  // Los equipos de la vitrina no se repiten en las secciones de abajo.
  const vitrinaSlugs = new Set(vitrina.map((unit) => unit.slug));
  const shelfUnits = featuredUnits.filter((unit) => !vitrinaSlugs.has(unit.slug));
  const recentUnits = latestUnits.filter((unit) => !vitrinaSlugs.has(unit.slug));
  const homeFaq = HOME_FAQ_IDS.map((id) => FAQ_ITEMS.find((item) => item.id === id)).filter((item): item is (typeof FAQ_ITEMS)[number] => Boolean(item));
  const whatsapp = whatsappUrl("Hola Macsomenos, quisiera ayuda para elegir un equipo.");

  return (
    <div className="pb-8">
      <HomeViewTracker />

      <CampaignHero products={heroProducts} promotions={heroPromotions}>
        <HeroVitrina units={vitrina} inventory={categories} hasOffers={heroPromotions.length > 0} whatsapp={whatsapp} />
      </CampaignHero>

      <section className="px-4 pt-8 sm:px-6">

        <nav aria-label="Categorías" className="mx-auto max-w-7xl">
          <ul className="ms-shelf -mx-4 flex gap-3 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6">
            {categoryRow.map((cat) => (
              <li key={cat.key} className="shrink-0">
                <Link href={`/c/${cat.key}`} className="ms-store-card group flex w-[136px] flex-col items-center rounded-[24px] bg-white px-3 pb-4 pt-3 text-center sm:w-[156px]">
                  <span className="ms-leaf-sm relative block h-[84px] w-full bg-[color:var(--brand-tint)]">
                    <Image src={cat.icon} alt="" fill sizes="156px" className="object-contain p-2 transition duration-300 group-hover:scale-105" priority />
                  </span>
                  <span className="mt-3 text-[17px] font-semibold text-[color:var(--foreground)]">{CATEGORY_LABELS[cat.key]}</span>
                  {cat.minPrice ? <span className="mt-0.5 text-[13px] text-[color:var(--foreground-soft)]">Desde {formatSoles(withIgv(cat.minPrice)).replace(/\.00$/, "")}</span> : null}
                </Link>
              </li>
            ))}
            <li className="shrink-0">
              <Link href="/ofertas" className="ms-store-card group flex w-[136px] flex-col items-center rounded-[24px] bg-[color:var(--foreground)] px-3 pb-4 pt-3 text-center sm:w-[156px]">
                <span className="ms-leaf-sm flex h-[84px] w-full items-center justify-center bg-[color:var(--accent)] text-3xl font-bold text-white" aria-hidden="true">%</span>
                <span className="mt-3 text-[17px] font-semibold text-white">Ofertas</span>
                <span className="mt-0.5 text-[13px] text-white/80">Precios rebajados</span>
              </Link>
            </li>
          </ul>
        </nav>
      </section>

      {shelfUnits.length > 0 && (
        <Reveal aria-labelledby="featured-title" className="px-4 pt-12 sm:px-6 sm:pt-16">
          <div className="mx-auto max-w-7xl">
            <BrandHeading id="featured-title" title="Destacados" note="Equipos elegidos de nuestro inventario, con su condición y su batería a la vista." />
            <div data-reveal style={{ "--reveal-order": 1 } as React.CSSProperties} className="mt-8">
              <StoreShelf label="Equipos destacados">
                {shelfUnits.map((unit, index) => <StoreFeatureCard key={unit.slug} unit={unit} priority={index < 2} />)}
              </StoreShelf>
            </div>
          </div>
        </Reveal>
      )}

      <Reveal aria-labelledby="about-title" className="px-4 pt-12 sm:px-6 sm:pt-16">
        <div className="ms-leaf relative mx-auto max-w-7xl overflow-hidden bg-[color:var(--foreground)] px-7 py-12 text-white sm:px-14 sm:py-16">
          <LeafMark className="pointer-events-none absolute -right-10 -top-12 h-64 w-64 opacity-[0.12] sm:h-96 sm:w-96" color="#ffffff" />
          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div data-reveal>
              <h2 id="about-title" className="ms-h2">Hola, somos Macsomenos.</h2>
              <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-white/90">
                Nuestro nombre lo dice: más Apple, menos gasto. Publicamos cada equipo con sus fotos, su batería y su precio para que elijas con calma, y te atendemos por WhatsApp.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 text-base font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--brand-tint)]">
                  <WhatsAppIcon className="h-5 w-5 text-[#1f9d55]" />
                  {WHATSAPP_DISPLAY}
                </a>
                <a href={WAREHOUSE_MAP} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-full bg-white/12 px-6 text-base font-semibold text-white hover:bg-white/20">
                  Cómo llegar al almacén
                </a>
              </div>
            </div>
            <dl data-reveal style={{ "--reveal-order": 1 } as React.CSSProperties} className="grid content-start gap-3">
              {[
                ["Almacén", `${WAREHOUSE}. El recojo aquí es gratis.`],
                ["Entregas", "En centros comerciales de Lima, según el precio del equipo."],
                ["Atención", "Por WhatsApp, antes y después de tu compra."],
              ].map(([label, text]) => (
                <div key={label} className="ms-leaf-sm bg-white/10 px-5 py-4">
                  <dt className="text-[15px] font-semibold text-[#9ec1ff]">{label}</dt>
                  <dd className="mt-1 text-[17px] leading-snug text-white">{text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Reveal>

      <Reveal aria-labelledby="latest-title" className="px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <BrandHeading id="latest-title" title="Recién llegados al almacén" />
            <Link href="/novedades" className="inline-flex min-h-11 items-center text-[17px] font-semibold text-[color:var(--accent)] hover:underline">Ver todas las novedades →</Link>
          </div>
          {recentUnits.length ? (
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {recentUnits.map((unit, index) => (
                <li key={unit.slug} data-reveal style={{ "--reveal-order": index % 4 } as React.CSSProperties}>
                  <StoreProductCard unit={unit} />
                </li>
              ))}
            </ul>
          ) : (
            <p role={catalogUnavailable ? "alert" : undefined} className="mt-8 rounded-[24px] bg-white p-8 text-[17px]">
              {catalogUnavailable ? "El catálogo no está disponible temporalmente." : "Por ahora no hay equipos para mostrar."}{" "}
              <Link className="font-semibold text-[color:var(--accent)] hover:underline" href="/contact">Consulta por WhatsApp</Link>.
            </p>
          )}
        </div>
      </Reveal>

      <Reveal aria-labelledby="steps-title" className="px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-7xl">
          <BrandHeading id="steps-title" title="Así compras en Macsomenos" note="Sin pagos en la web: primero confirmamos contigo por WhatsApp." />
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text], index) => (
              <li key={title} data-reveal style={{ "--reveal-order": index + 1 } as React.CSSProperties} className="ms-leaf-sm bg-white p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--brand-tint)] text-lg font-bold text-[color:var(--accent)]" aria-hidden="true">{index + 1}</span>
                <h3 className="mt-5 text-[21px] font-semibold leading-tight tracking-[-0.02em]">{title}</h3>
                <p className="mt-2 text-[17px] leading-relaxed text-[color:var(--foreground-soft)]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Reveal>

      {budgets?.length > 0 && (
        <Reveal aria-labelledby="budget-title" className="px-4 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-7xl">
            <BrandHeading id="budget-title" title="Según tu presupuesto" note="Rangos con IGV, armados con el inventario de hoy." />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {budgets.map((band, index) => {
                const params = new URLSearchParams();
                if (band.min) params.set("min", String(band.min));
                if (band.max) params.set("max", String(band.max));
                return (
                  <li key={band.key} data-reveal style={{ "--reveal-order": index + 1 } as React.CSSProperties}>
                    <Link href={`${band.category ? `/c/${band.category}` : "/buscar"}?${params.toString()}`} className="ms-store-card flex min-h-[140px] flex-col justify-between rounded-[24px] bg-white p-7">
                      <span className="text-[21px] font-semibold leading-tight tracking-[-0.02em]">{band.label}</span>
                      <span className="mt-4 text-[17px] font-semibold text-[color:var(--accent)]">{band.count} {band.count === 1 ? "equipo" : "equipos"} →</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      )}

      <ClientDeliveriesHome items={clientPurchases} />

      <GoogleReviews />

      <section aria-labelledby="faq-title" className="px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <BrandHeading id="faq-title" title="Antes de comprar" note="Las dudas más comunes sobre el estado, el precio y la entrega de los equipos." />
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/preguntas-frecuentes" className="inline-flex min-h-12 items-center rounded-full bg-[color:var(--foreground)] px-6 font-semibold text-white hover:bg-[color:var(--accent-strong)]">Ver todas las preguntas</Link>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-[color:var(--accent-strong)] hover:underline">
                <WhatsAppIcon className="h-5 w-5 text-[#1f9d55]" />
                Preguntar por WhatsApp
              </a>
            </div>
          </div>
          <div className="rounded-[24px] bg-white px-5 sm:px-7">
            {homeFaq.map((item, index) => <FaqEntry key={item.id} item={item} defaultOpen={index === 0} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
