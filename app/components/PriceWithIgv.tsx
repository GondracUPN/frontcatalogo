// Dos importes visibles con el cálculo comercial compartido.
import { withIgv } from "@/lib/catalog-price";

type PriceWithIgvProps = {
  price: number;
  compareAt?: number | null;
  wrapperClassName?: string;
  rowClassName?: string;
  priceClassName?: string;
  labelClassName?: string;
  compareAtClassName?: string;
  igvClassName?: string;
};

function money(value: number) {
  return Number(value || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PriceWithIgv({
  price,
  compareAt,
  wrapperClassName = "",
  rowClassName = "flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
  priceClassName = "text-xl font-bold tracking-[-0.03em] text-[color:var(--foreground)]",
  labelClassName = "text-[11px] font-semibold uppercase tracking-wide text-[color:var(--foreground-soft)]",
  compareAtClassName = "text-sm text-[color:var(--foreground-soft)] line-through",
  igvClassName = "mt-1",
}: PriceWithIgvProps) {
  const cleanPrice = Number(price || 0);
  const hasDiscount = Boolean(compareAt && compareAt > cleanPrice);
  const discountPct = hasDiscount ? Math.round((1 - cleanPrice / Number(compareAt)) * 100) : 0;

  return (
    <div className={wrapperClassName}>
      <div className={rowClassName}>
        <span className={labelClassName}>Precio sin IGV</span>
        <span className="text-sm font-semibold text-[color:var(--foreground)]">S/ {money(cleanPrice)}</span>
        {hasDiscount && (
          <>
            <span className={compareAtClassName}>S/ {money(Number(compareAt))}</span>
            {discountPct > 0 && <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-bold text-red-700">-{discountPct}%</span>}
          </>
        )}
      </div>
      <div className={igvClassName}>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[color:var(--foreground-soft)]">Precio con IGV</div>
        <div className={priceClassName}>S/ {money(withIgv(cleanPrice))}</div>
      </div>
    </div>
  );
}
