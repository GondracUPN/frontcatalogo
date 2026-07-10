import fs from "node:fs/promises";
import path from "node:path";
import { normalizeProductVersionConfig, type ProductVersionConfig } from "./product-version-config";

const CONFIG_PATH = path.join(process.cwd(), "storage", "product-version-config.json");

export async function readProductVersionConfig(): Promise<ProductVersionConfig> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf8");
    return normalizeProductVersionConfig(JSON.parse(raw));
  } catch {
    return normalizeProductVersionConfig();
  }
}

export async function writeProductVersionConfig(config: Partial<ProductVersionConfig>) {
  const normalized = normalizeProductVersionConfig(config);
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}
