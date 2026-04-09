import { promises as fs } from "node:fs";
import path from "node:path";
import CategoryClientsCarouselClient from "./CategoryClientsCarouselClient";

async function getClientImages(): Promise<string[]> {
  try {
    const dir = path.join(process.cwd(), "public", "clientes");
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => /\.(png|jpe?g|webp|gif|avif)$/i.test(name))
      .filter((name) => name.toLowerCase() !== "logo.png");
    const withTimes = await Promise.all(
      files.map(async (name) => {
        const stat = await fs.stat(path.join(dir, name));
        return { name, mtime: stat.mtimeMs };
      })
    );
    return withTimes
      .sort((a, b) => b.mtime - a.mtime)
      .map((f) => `/clientes/${f.name}`);
  } catch {
    return [];
  }
}

export default async function CategoryClientsCarousel() {
  const images = await getClientImages();
  return <CategoryClientsCarouselClient images={images} />;
}
