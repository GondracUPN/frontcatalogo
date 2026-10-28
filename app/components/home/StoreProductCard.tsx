import Image from "next/image";
import Link from "next/link";
import { conditionTone, formatRam } from "@/lib/catalog-display";
import { formatSoles, withIgv } from "@/lib/catalog-price";
import { formatStorageDisplay } from "@/lib/storage";

export type StoreUnit = {
  slug: string;
  title: string;
  image: string;
  condition: string;
  availabilityLabel?: string;
  processor?: string | null;
  ram?: string | number | null;
  storage?: string | number | null;
  batteryHealth?: string | number | null;
  batteryCycles?: string | number | null;
  price: number;
  compareAt?: number | null;
  promoLabel?: string;
};

export function specLine(unit: StoreUnit) {
  return [unit.processor, unit.ram && `${formatRam(unit.ram)} RAM`, unit.storage && formatStorageDisplay(unit.storage)].filter(Boolean).join(" · ");
}

export function batteryLine(unit: StoreUnit) {
  const health = unit.batteryHealth !== "" && unit.batteryHealth != null ? `Batería ${String(unit.batteryHealth).replace(/%$/, "")}%` : "";
  const cycles = unit.batteryCycles !== "" && unit.batteryCycles != null ? `${unit.batteryCycles} ciclos` : "";
  return [health, cycles].filter(Boolean).join(" · ");
}

// Tarjeta de producto de la cuadrícula: foto a sangre arriba y, debajo, nombre,
// configuración y precio. Nombre y configuración reservan dos líneas cada uno
// para que todas las tarjetas (y ambas secciones de la portada) midan lo mismo.
export default function StoreProductCard({ unit }: { unit: StoreUnit }) {
  const battery = batteryLine(unit);
  return (
    <Link href={`/product/${unit.slug}`} className="ms-store-card group flex h-full flex-col overflow-hidden rounded-[24px] bg-white">
      <span className="relative block aspect-[4/5] overflow-hidden bg-[color:var(--brand-tint)]">
        <Image src={unit.image || "/placeholder.svg"} alt={unit.title} fill sizes="(max-width: 1024px) 50vw, 320px" className="object-cover transition duration-500 group-hover:scale-[1.04]" loading="lazy" />
        {unit.condition && <span className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[12px] font-semibold shadow-sm sm:text-[13px] ${conditionTone(unit.condition)}`}>{unit.condition}</span>}
      </span>
      <span className="flex flex-1 flex-col p-4 sm:p-5">
        <span className="line-clamp-2 min-h-[2.75em] text-[15px] font-semibold leading-snug text-[color:var(--foreground)] sm:text-[17px]">{unit.title}</span>
        <span className="mt-1 line-clamp-2 min-h-[2.75em] text-[13px] leading-snug text-[color:var(--foreground-soft)] sm:text-[15px]">{[specLine(unit), battery].filter(Boolean).join(" · ")}</span>
        <span className="mt-auto block pt-3">
          <span className="block whitespace-nowrap text-[16px] font-semibold tabular-nums text-[color:var(--foreground)] sm:text-[18px]">{formatSoles(withIgv(unit.price))}</span>
          <span className="block text-[12px] text-[color:var(--foreground-soft)] sm:text-[13px]">con IGV</span>
        </span>
      </span>
    </Link>
  );
}
