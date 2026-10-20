import type { MetadataRoute } from "next";
import { listCatalog } from "./actions";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.macsomenos.com";
  const paths = ["/", "/categorias", "/novedades", "/ofertas", "/proximos", "/contact", "/preguntas-frecuentes", "/clientes", "/cookies", "/c/macbook", "/c/iphone", "/c/ipad", "/c/watch", "/c/otros"];
  const { items } = await listCatalog().catch(() => ({ items: [] as any[] }));
  const slugs = new Set<string>((items || []).map((item: any) => String(item.slug || "")).filter(Boolean));
  return [...paths.map((path) => ({ url: `${base}${path}`, changeFrequency: "weekly" as const })), ...Array.from(slugs).map((slug) => ({ url: `${base}/product/${encodeURIComponent(slug)}`, changeFrequency: "daily" as const }))];
}
