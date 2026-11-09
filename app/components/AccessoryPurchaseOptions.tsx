"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { AccessoryPack } from "@/lib/accessories";
import type { WhatsAppProduct } from "@/lib/store-config";
import { formatSoles, withIgv } from "@/lib/catalog-price";
import AddToCartClient from "./AddToCartClient";
import WhatsAppProductLink from "./WhatsAppProductLink";
import PriceWithIgv from "./PriceWithIgv";
import MobileProductAction from "./MobileProductAction";

export default function AccessoryPurchaseOptions({ product, productId, pack, stock, saleType, salePrice }: {
  product: WhatsAppProduct; productId: string; pack: AccessoryPack; stock: number; saleType: string; salePrice: number;
}) {
  const [units, setUnits] = useState(1);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const presentation = units === 1 ? "Unidad" : `${pack.label} de ${pack.units} unidades`;
  const selected = { ...product, price: units === 1 ? product.price : pack.price, variant: [product.variant, `Presentación: ${presentation}`].filter(Boolean).join(" · ") };
  return <div className="space-y-3">
    <label className="block text-sm font-semibold">Presentación
      <select aria-label="Presentación del accesorio" value={units} onChange={(event) => setUnits(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-[color:var(--border)] bg-white px-3 text-sm font-normal">
        <option value={1}>Unidad · {formatSoles(withIgv(product.price))} con IGV</option>
        <option value={pack.units} disabled={stock < pack.units}>{pack.label} de {pack.units} unidades · {formatSoles(withIgv(pack.price))} con IGV{stock < pack.units ? " · Stock insuficiente" : ""}</option>
      </select>
    </label>
    {units > 1 && <div className="rounded-xl bg-[color:var(--brand-tint)] p-3"><p className="mb-2 text-sm font-semibold">{presentation} · precio por la presentación completa</p><PriceWithIgv price={pack.price} /></div>}
    <WhatsAppProductLink {...selected} productId={productId} />
    <AddToCartClient key={units} productId={productId} productTitle={product.title} productSlug={product.slug} sku={product.sku} saleType={saleType} salePrice={salePrice} quantity={units} disabled={!productId} />
    <p className="text-xs leading-5 text-[color:var(--foreground-soft)]">El carrito cuenta unidades: cada grupo de {pack.units} usa el precio de {pack.label.toLowerCase()} y el resto, el precio por unidad.</p>
    {mounted && createPortal(<MobileProductAction product={{ ...selected, title: `${product.title} · ${presentation}` }} productId={productId} />, document.body)}
  </div>;
}
