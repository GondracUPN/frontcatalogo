import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/servmacso10/", "/api/", "/cart", "/checkout", "/login", "/buscar"] },
    sitemap: "https://www.macsomenos.com/sitemap.xml",
  };
}
