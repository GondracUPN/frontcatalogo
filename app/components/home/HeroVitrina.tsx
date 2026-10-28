import Link from "next/link";
import { CATEGORY_LABELS } from "@/lib/catalog-display";
import VitrinaRotator from "./VitrinaRotator";
import { HERO_COPY, WHATSAPP_DISPLAY, WHATSAPP_INTERNATIONAL } from "@/lib/store-config";
import WhatsAppIcon from "../WhatsAppIcon";

// Portada «La vitrina Macsomenos»: texto a la izquierda y, a la derecha, una
// vitrina con unidades reales del inventario. Foto, condición, dato breve,
// precio y enlace salen de la MISMA fila del inventario: nada de ejemplo.

export type VitrinaUnit = {
  slug: string;
  title: string;
  image: string;
  condition: string;
  saleType?: string;
  /** Dato breve de esa unidad: batería en usados, configuración en el resto. */
  detail: string;
  price: number;
  compareAt: number | null;
};

export default function HeroVitrina({
  units,
  inventory,
  hasOffers,
  whatsapp,
}: {
  units: VitrinaUnit[];
  inventory: Array<{ key: string; total: number }>;
  hasOffers: boolean;
  whatsapp: string;
}) {
  const main = units[0];
  const total = inventory.reduce((sum, row) => sum + row.total, 0);
  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden px-4 sm:px-6">
      <div className="mx-auto grid max-w-7xl items-center gap-8 pb-8 pt-6 sm:pb-12 sm:pt-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
        <div className="max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-[color:var(--foreground)] shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0 fill-none stroke-[color:var(--accent)] stroke-[2.2]"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" strokeLinejoin="round" /><circle cx="12" cy="9.5" r="2.5" /></svg>
            {HERO_COPY.location}
          </p>
          <h1 id="hero-title" className="ms-hero-title mt-5 text-[color:var(--foreground)]">
            {HERO_COPY.slogan.map((line) => (
              <span key={line.text} className={`block whitespace-nowrap ${line.accent ? "text-[color:var(--accent)]" : ""}`}>{line.text}</span>
            ))}
          </h1>
          <p className="mt-4 max-w-[40ch] text-lg leading-[1.5] text-[color:var(--foreground-soft)] sm:text-xl">{HERO_COPY.description}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/categorias" className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[color:var(--accent)] px-6 text-base font-semibold text-white transition-colors hover:bg-[color:var(--accent-strong)] sm:px-7">
              Explorar equipos <span aria-hidden="true">→</span>
            </Link>
            {hasOffers && (
              <Link href="/ofertas" className="inline-flex min-h-[52px] items-center rounded-full border border-[color:var(--border-strong)] bg-white px-6 text-base font-semibold text-[color:var(--foreground)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent-strong)]">
                Ver ofertas
              </Link>
            )}
          </div>
          <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px] text-[color:var(--foreground)]">
            <li className="flex min-h-11 items-center gap-2">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-[color:var(--accent)] stroke-2"><path d="M4 8h3l2-3h6l2 3h3v11H4z" strokeLinejoin="round" /><circle cx="12" cy="13" r="3.5" /></svg>
              Fotos reales
            </li>
            <li className="flex min-h-11 items-center gap-2">
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-[color:var(--accent)] stroke-2"><path d="M3 10.5 12 4l9 6.5V20H3z" strokeLinejoin="round" /><path d="M9 20v-6h6v6" strokeLinejoin="round" /></svg>
              Recojo en Surco
            </li>
            <li>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${WHATSAPP_INTERNATIONAL}`} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-full font-semibold underline-offset-4 hover:underline">
                <WhatsAppIcon className="h-5 w-5 shrink-0 text-[#1f9d55]" />
                {WHATSAPP_DISPLAY}
              </a>
            </li>
          </ul>
        </div>

        {main ? (
          <div>
            <VitrinaRotator units={units} />
            {total > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[color:var(--foreground-soft)]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[color:var(--foreground)]">
                  <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
                  {total} {total === 1 ? "equipo publicado" : "equipos publicados"}
                </span>
                {inventory.filter((row) => row.total > 0).map((row) => (
                  <Link key={row.key} href={`/c/${row.key}`} className="inline-flex min-h-8 items-center underline-offset-4 hover:text-[color:var(--foreground)] hover:underline">
                    {CATEGORY_LABELS[row.key] || row.key} {row.total}
                  </Link>
                ))}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
