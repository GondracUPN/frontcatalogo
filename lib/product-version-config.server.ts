import { normalizeProductVersionConfig, type ProductVersionConfig } from "./product-version-config";

function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

async function requestProductVersionConfig(token: string, init?: RequestInit) {
  const res = await fetch(`${apiBase()}/admin/product-versions`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) throw new Error("No se pudo guardar la configuracion de versiones");
  return body.config;
}

export async function readProductVersionConfig(token: string): Promise<ProductVersionConfig> {
  const config = await requestProductVersionConfig(token);
  return normalizeProductVersionConfig(config);
}

export async function writeProductVersionConfig(token: string, config: Partial<ProductVersionConfig>) {
  const saved = await requestProductVersionConfig(token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  return normalizeProductVersionConfig(saved);
}
