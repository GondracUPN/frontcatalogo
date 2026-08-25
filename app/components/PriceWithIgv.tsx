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
  return Number(value || 0).toFixed(2);
}

export default function PriceWithIgv({
  price,
  compareAt,
  wrapperClassName = "",
  rowClassName = "flex flex-wrap items-center gap-2",
  priceClassName = "text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]",
  labelClassName = "text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-400",
  compareAtClassName = "text-sm text-[color:var(--foreground-soft)] line-through",
  igvClassName = "mt-1 text-sm font-medium text-emerald-500",
}: PriceWithIgvProps) {
  const cleanPrice = Number(price || 0);
  const priceWithIgv = cleanPrice * 1.18;

  return (
    <div className={wrapperClassName}>
      <div className={rowClassName}>
        <span className={priceClassName}>S/ {money(cleanPrice)}</span>
        <span className={labelClassName}>Precio sin IGV</span>
        {compareAt && compareAt > cleanPrice && (
          <span className={compareAtClassName}>S/ {money(compareAt)}</span>
        )}
      </div>
      <div className={igvClassName}>
        Total con IGV: <span className="font-semibold text-[color:var(--foreground)]">S/ {money(priceWithIgv)}</span>
      </div>
    </div>
  );
}
