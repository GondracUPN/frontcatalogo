import Image from "next/image";
import Link from "next/link";
import { conditionTone, formatRam } from "@/lib/catalog-display";
import { formatSoles, withIgv } from "@/lib/catalog-price";
import { formatStorageDisplay } from "@/lib/storage";

// «Otras unidades disponibles»: unidades físicas del mismo modelo (misma
// familia, calculada en el backend con datos estructurados). Cada unidad es
// su propia ficha con su propia URL: elegir otra abre su ficha, así el SKU,
// las fotos, la batería y el precio nunca se mezclan entre unidades.

export type UnitOption = {
  slug: string;
  title?: string;
  image?: string;
  color?: string | null;
  condition?: string;
  ram?: string | number | null;
  storage?: string | number | null;
  batteryHealth?: string | number | null;
  batteryCycles?: string | number | null;
  price: number;
  compareAt?: number | null;
  availability?: string;
};

function line(unit: UnitOption, showMemory: boolean) {
  return [
    showMemory && unit.ram ? `${formatRam(unit.ram)} RAM` : "",
    showMemory && unit.storage ? formatStorageDisplay(unit.storage) : "",
  ].filter(Boolean).join(" · ");
}

function battery(unit: UnitOption) {
  const health = String(unit.batteryHealth ?? "").trim();
  const cycles = String(unit.batteryCycles ?? "").trim();
  return [health ? `Batería ${health.replace(/%$/, "")}%` : "", cycles ? `${cycles} ciclos` : ""].filter(Boolean).join(" · ");
}

export default function ProductUnitPicker({ units, currentSlug, showMemory = true, heading = "Otras unidades disponibles", minUnits = 2 }: { units: UnitOption[]; currentSlug: string; showMemory?: boolean; heading?: string; minUnits?: number }) {
  if (units.length < minUnits) return null;
  return (
    <section aria-labelledby="unit-picker-title">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="unit-picker-title" className="text-[15px] font-semibold text-[color:var(--foreground)]">{heading}</h2>
        <span className="text-sm text-[color:var(--foreground-soft)]">{units.length} {units.length === 1 ? "unidad" : "unidades"}</span>
      </div>
      <ul className="ms-shelf -mx-1 mt-2.5 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
        {units.map((unit) => {
          const selected = unit.slug === currentSlug;
          const spec = line(unit, showMemory);
          const bat = battery(unit);
          const content = (
            <>
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[color:var(--surface-muted)]">
                {unit.image && <Image src={unit.image} alt="" fill sizes="56px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-[color:var(--foreground)]">{unit.color || "Color no registrado"}</span>
                  {unit.condition && <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${conditionTone(unit.condition)}`}>{unit.condition}</span>}
                </span>
                {spec && <span className="block truncate text-[13px] text-[color:var(--foreground-soft)]">{spec}</span>}
                {bat && <span className="block text-[13px] text-[color:var(--foreground-soft)]">{bat}</span>}
                <span className="mt-0.5 block text-[15px] font-bold text-[color:var(--foreground)]">
                  {formatSoles(withIgv(unit.price))} <span className="text-[11px] font-medium text-[color:var(--foreground-soft)]">con IGV</span>
                </span>
              </span>
              {selected && (
                <span className="absolute right-2.5 top-2.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color:var(--accent)] text-white">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3 w-3 fill-none stroke-current stroke-[3]"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                </span>
              )}
            </>
          );
          const base = "relative flex h-full min-h-[92px] w-[264px] items-start gap-3 rounded-[18px] border-2 p-2.5 pr-8 text-left transition-colors sm:w-auto";
          return (
            <li key={unit.slug} className="shrink-0 snap-start">
              {selected ? (
                <div aria-current="true" className={`${base} border-[color:var(--accent)] bg-[color:var(--brand-tint)]`}>
                  <span className="sr-only">Unidad que estás viendo: </span>
                  {content}
                </div>
              ) : (
                <Link href={`/product/${unit.slug}`} className={`${base} border-transparent bg-[color:var(--background)] hover:border-[color:var(--border-strong)] focus-visible:border-[color:var(--accent)]`}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
