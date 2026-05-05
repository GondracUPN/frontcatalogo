import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  outputFileTracingRoot: process.cwd(),
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 414, 640, 768, 1024, 1280],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
  },
};

export default nextConfig;
