"use client";

import type { ReactNode } from "react";
import { useCampaign, useThemeMode } from "../theme/SiteThemeProvider";
import { LAYOUT_COMPONENTS } from "./layouts";
import { orderProducts, type HeroProduct } from "./parts";

/**
 * Bloque principal de la portada. Sin temática muestra el diseño habitual
 * (children, renderizado en el servidor); con temática, la composición de la
 * campaña con productos reales del inventario.
 */
export default function CampaignHero({ products, promotions, children }: { products: HeroProduct[]; promotions: HeroProduct[]; children: ReactNode }) {
  const campaign = useCampaign();
  const mode = useThemeMode();
  if (!campaign) return <>{children}</>;
  // Solo en la demo de desarrollo: ?theme_products=N y ?theme_promos=N simulan
  // inventarios pequeños; ?theme_broken=1, fotos que no cargan.
  if (mode === "demo" && typeof window !== "undefined") {
    const q = new URLSearchParams(window.location.search);
    if (q.has("theme_products")) products = products.slice(0, Number(q.get("theme_products")) || 0);
    if (q.has("theme_promos")) promotions = promotions.slice(0, Number(q.get("theme_promos")) || 0);
    if (q.has("theme_broken")) products = products.map((p) => ({ ...p, image: "/uploads/no-existe.jpg" }));
  }
  const Layout = LAYOUT_COMPONENTS[campaign.layout] || LAYOUT_COMPONENTS.split;
  // Sin promociones reales no se prometen rebajas (salvo texto propio del panel).
  const hasPromos = promotions.some((p) => Number(p.compareAt) > Number(p.price));
  const c = !hasPromos && campaign.textNoPromos && !campaign.customSubtitle ? { ...campaign, copy: { ...campaign.copy, text: campaign.textNoPromos } } : campaign;
  // Las promociones reales van primero; luego destacados y recién llegados.
  const ordered = orderProducts(c, [...promotions, ...products]);
  return <Layout c={c} products={ordered} promotions={promotions} />;
}
