import type { MetadataRoute } from "next";
import { listCatalog } from "./actions";
import { listingRows } from "@/lib/catalog-listing";

export const revalidate = 3600;

const BASE = "https://www.macsomenos.com";
const STATIC_PATHS = ["/", "/categorias", "/novedades", "/ofertas", "/contact", "/preguntas-frecuentes", "/clientes", "/cookies"];
const CATEGORIES = ["macbook", "macmini", "imac", "ipad", "iphone", "watch", "airpods", "otros", "accesorios"];

function saleType(row: any) {
  try {
    const notes = typeof row?.staged?.notes === "string" ? JSON.parse(row.staged.notes) : row?.staged?.notes || {};
    return String(row?.product?.sale_type || row?.staged?.sale_type || notes?.saleType || "").toUpperCase();
  } catch {
    return String(row?.product?.sale_type || row?.staged?.sale_type || "").toUpperCase();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { items } = await listCatalog().catch(() => ({ items: [] as any[] }));
  const rows = items || [];

  // Solo listados con equipos: una categoría vacía lleva noindex (soft 404).
  const categories = await Promise.all(CATEGORIES.map(async (category) => {
    const { items: catItems } = await listCatalog({ category }).catch(() => ({ items: [] as any[] }));
    return listingRows(catItems).length ? `/c/${category}` : "";
  }));
  const hasPreorders = rows.some((row: any) => row?.product?.status !== "sold" && saleType(row) === "PREVENTA");
  const paths = [...STATIC_PATHS, ...(hasPreorders ? ["/proximos"] : []), ...categories.filter(Boolean)];

  // Unidades disponibles, con sus fotos para Google Imágenes.
  const products = new Map<string, string[]>();
  for (const item of rows) {
    if (item.availability === "sold" || item.availability === "reserved") continue;
    const slug = String(item.slug || "");
    if (!slug || products.has(slug)) continue;
    const images = Array.isArray(item.images) && item.images.length ? item.images : Array.isArray(item.staged?.images) ? item.staged.images : [];
    products.set(slug, images.filter((url: unknown) => typeof url === "string" && /^https?:\/\//.test(url)).slice(0, 10));
  }

  return [
    ...paths.map((path) => ({ url: `${BASE}${path}`, changeFrequency: "weekly" as const })),
    ...Array.from(products, ([slug, images]) => ({
      url: `${BASE}/product/${encodeURIComponent(slug)}`,
      changeFrequency: "daily" as const,
      ...(images.length ? { images } : {}),
    })),
  ];
}
