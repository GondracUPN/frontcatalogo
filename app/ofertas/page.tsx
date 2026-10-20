import type { Metadata } from "next";
import Link from "next/link";
import { listCatalog } from "../actions";
import CategoryBrowser from "../components/CategoryBrowser";
import OffersHeader from "./OffersHeader";
import { isBuildPhase, listingRows } from "@/lib/catalog-listing";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Equipos Apple con precio especial en Macsomenos: promociones vigentes y equipos con precio negociable.",
  alternates: { canonical: "/ofertas" },
};

export const revalidate = 300;

function saleTypeOf(row: any) {
  return String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
}

function isAvailable(row: any) {
  const stock = Number(row?.product?.stock ?? row?.staged?.stock ?? 0);
  return row?.product?.status !== "sold" && stock > 0;
}

export default async function OfertasPage() {
  let catalogUnavailable = false;
  let items: any[] = [];
  try {
    ({ items } = await listCatalog());
  } catch (error) {
    if (!isBuildPhase()) throw error;
    catalogUnavailable = true;
  }
  // Primero las promociones con descuento; luego los equipos con precio negociable.
  const offers = listingRows((items || [])
    .filter((row: any) => ["PROMOCION", "OFERTA"].includes(saleTypeOf(row)) && isAvailable(row))
    .sort((a: any, b: any) => Number(saleTypeOf(a) !== "PROMOCION") - Number(saleTypeOf(b) !== "PROMOCION")));

  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pt-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <OffersHeader count={offers.length} />
        {catalogUnavailable ? (
          <div role="alert" className="rounded-2xl bg-slate-50 p-6 text-sm">El catálogo no está disponible temporalmente. Intenta de nuevo más tarde.</div>
        ) : offers.length ? (
          <div className="surface-card-strong p-4 sm:p-6">
            <CategoryBrowser initialItems={offers} />
          </div>
        ) : (
          <div className="surface-card-strong p-8 text-center">
            <Link href="/categorias" className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--accent)] px-6 text-sm font-semibold text-white">Ver todo el catálogo</Link>
          </div>
        )}
      </div>
    </div>
  );
}
