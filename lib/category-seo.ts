// Textos SEO de las páginas de categoría (/c/[category]). Se apoyan solo en
// hechos publicados en Preguntas frecuentes: fotos reales, batería registrada,
// precios con IGV, recojo gratis en Surco y contraentrega en Lima.

export type CategorySeo = { title: string; description: string; intro: string };

const SHARED = "Cada ficha muestra fotos reales de la unidad, su condición y el precio total con IGV. Recojo gratis en Surco o contraentrega en centros comerciales de Lima.";

const CATEGORY_SEO: Record<string, CategorySeo> = {
  macbook: {
    title: "MacBook usadas, Open Box y nuevas en Lima, Perú",
    description: "MacBook Air y MacBook Pro usadas, Open Box y nuevas en Lima. Fotos reales, salud de batería y ciclos, precio con IGV. Recojo en Surco o contraentrega en Lima.",
    intro: `MacBook Air y MacBook Pro nuevas, Open Box y usadas en Lima. Revisamos cada MacBook con la herramienta de diagnóstico de Apple y registramos la salud de la batería y los ciclos. ${SHARED}`,
  },
  macmini: {
    title: "Mac mini usados, Open Box y nuevos en Lima, Perú",
    description: "Mac mini nuevos, Open Box y usados en Lima. Fotos reales, configuración detallada y precio con IGV. Recojo en Surco o contraentrega en Lima.",
    intro: `Mac mini nuevos, Open Box y usados en Lima, con su procesador, memoria y almacenamiento detallados. ${SHARED}`,
  },
  imac: {
    title: "iMac usados, Open Box y nuevos en Lima, Perú",
    description: "iMac nuevos, Open Box y usados en Lima. Fotos reales, configuración detallada y precio con IGV. Recojo en Surco o contraentrega en Lima.",
    intro: `iMac nuevos, Open Box y usados en Lima, con su configuración detallada. ${SHARED}`,
  },
  ipad: {
    title: "iPad usados, Open Box y nuevos en Lima, Perú",
    description: "iPad, iPad Air, iPad Pro y iPad mini nuevos, Open Box y usados en Lima. Fotos reales, batería registrada y precio con IGV.",
    intro: `iPad, iPad Air, iPad Pro y iPad mini nuevos, Open Box y usados en Lima. En los usados y Open Box se indica la salud de la batería. ${SHARED}`,
  },
  iphone: {
    title: "iPhone usados, Open Box y nuevos en Lima, Perú",
    description: "iPhone nuevos, Open Box y usados en Lima con salud de batería, almacenamiento y color. Fotos reales y precio con IGV. Recojo en Surco o contraentrega en Lima.",
    intro: `iPhone nuevos, Open Box y usados en Lima, con su almacenamiento, color, tipo de SIM y salud de la batería indicados en cada ficha. ${SHARED}`,
  },
  watch: {
    title: "Apple Watch usados, Open Box y nuevos en Lima, Perú",
    description: "Apple Watch Series, SE y Ultra nuevos, Open Box y usados en Lima. Fotos reales, tamaño, conectividad y precio con IGV.",
    intro: `Apple Watch Series, SE y Ultra nuevos, Open Box y usados en Lima, con su tamaño y conectividad (GPS o GPS + Cellular). ${SHARED}`,
  },
  airpods: {
    title: "AirPods usados, Open Box y nuevos en Lima, Perú",
    description: "AirPods, AirPods Pro y AirPods Max nuevos, Open Box y usados en Lima. Fotos reales y precio con IGV.",
    intro: `AirPods, AirPods Pro y AirPods Max nuevos, Open Box y usados en Lima. ${SHARED}`,
  },
  otros: {
    title: "Otros equipos Apple en Lima, Perú",
    description: "AirPods, Mac mini, AirTag y otros equipos Apple nuevos, Open Box y usados en Lima. Fotos reales y precio con IGV.",
    intro: `AirPods, Mac mini, AirTag y otros equipos Apple nuevos, Open Box y usados en Lima. ${SHARED}`,
  },
  accesorios: {
    title: "Accesorios para iPad, Mac y iPhone en Lima, Perú",
    description: "Teclados, fundas, Apple Pencil y accesorios para iPad, Mac y iPhone en Lima. Fotos reales y precio con IGV.",
    intro: `Teclados, fundas, Apple Pencil y otros accesorios para iPad, Mac y iPhone. ${SHARED}`,
  },
};

export function categorySeo(category: string, fallbackTitle: string): CategorySeo {
  return CATEGORY_SEO[category] || {
    title: `${fallbackTitle} en Lima, Perú`,
    description: `${fallbackTitle} en Lima. Fotos reales, condición y precio con IGV.`,
    intro: SHARED,
  };
}
