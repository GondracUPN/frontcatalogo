import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  // NEXT_DIST_DIR permite un segundo servidor de pruebas (e2e) sin pisar el de desarrollo.
  distDir: process.env.NEXT_DIST_DIR || (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  images: {
    formats: ["image/avif", "image/webp"],
    // 90 solo para las fotos de detalles estéticos (rayones y marcas).
    qualities: [75, 90],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 414, 640, 768, 1024, 1280],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
