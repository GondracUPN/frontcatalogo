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

// Tarjeta grande del estante de destacados: texto arriba y el equipo abajo.
export function StoreFeatureCard({ unit, priority = false }: { unit: StoreUnit; priority?: boolean }) {
  const battery = batteryLine(unit);
  return (
    <Link href={`/product/${unit.slug}`} className="ms-store-card group flex h-[460px] w-[82vw] max-w-[400px] shrink-0 snap-start flex-col overflow-hidden rounded-[24px] bg-white p-7 sm:h-[500px] sm:w-[400px]">
      <span className="flex flex-wrap gap-1.5">
        {unit.condition && <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${conditionTone(unit.condition)}`}>{unit.condition}</span>}
        {unit.promoLabel && <span className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-[13px] font-semibold text-white">{unit.promoLabel}</span>}
      </span>
      <span className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[color:var(--foreground)]">{unit.title}</span>
      <span className="mt-2 text-[15px] leading-snug text-[color:var(--foreground-soft)]">{[specLine(unit), battery].filter(Boolean).join(" · ")}</span>
      <span className="mt-3 text-[17px] font-semibold text-[color:var(--foreground)]">
        {formatSoles(withIgv(unit.price))} <span className="font-normal text-[color:var(--foreground-soft)]">con IGV</span>
        {unit.compareAt && unit.compareAt > unit.price ? <span className="ml-2 text-[color:var(--foreground-soft)] line-through">{formatSoles(withIgv(unit.compareAt))}</span> : null}
      </span>
      <span className="relative mt-auto block h-[230px] sm:h-[260px]">
        <Image src={unit.image || "/placeholder.svg"} alt={unit.title} fill priority={priority} sizes="400px" className="object-contain transition duration-500 group-hover:scale-[1.04]" />
      </span>
    </Link>
  );
}

// Tarjeta de producto de la cuadrícula: foto, nombre, configuración y precio.
export default function StoreProductCard({ unit }: { unit: StoreUnit }) {
  const battery = batteryLine(unit);
  return (
    <Link href={`/product/${unit.slug}`} className="ms-store-card group flex h-full flex-col rounded-[24px] bg-white p-5 sm:p-6">
      <span className="ms-leaf-sm relative block aspect-square overflow-hidden bg-[color:var(--brand-tint)]">
        <Image src={unit.image || "/placeholder.svg"} alt={unit.title} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-contain p-3 transition duration-500 group-hover:scale-[1.04]" loading="lazy" />
      </span>
      {unit.condition && <span className={`mt-4 self-start rounded-full px-3 py-1 text-[13px] font-semibold ${conditionTone(unit.condition)}`}>{unit.condition}</span>}
      <span className="mt-1 text-[17px] font-semibold leading-snug text-[color:var(--foreground)]">{unit.title}</span>
      <span className="mt-1 text-[15px] leading-snug text-[color:var(--foreground-soft)]">{[specLine(unit), battery].filter(Boolean).join(" · ")}</span>
      <span className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-4">
        <span className="text-[17px] font-semibold text-[color:var(--foreground)]">{formatSoles(withIgv(unit.price))}</span>
        <span className="text-[15px] text-[color:var(--foreground-soft)]">con IGV</span>
      </span>
      <span className="mt-4 inline-flex min-h-10 self-start items-center rounded-full bg-[color:var(--accent)] px-5 text-[15px] font-semibold text-white">Ver equipo</span>
    </Link>
  );
}
