"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidateTag } from "next/cache";
import { cache } from "react";
import type { MarketplaceData } from "@/lib/marketplace";

// Base URL de la API Nest (sin secretos)
function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

type ApiInit = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
  /** Corta la espera si la API no responde (solo lecturas públicas). */
  timeoutMs?: number;
};

// Lecturas públicas del catálogo: margen para el arranque en frío del backend,
// pero sin dejar una página colgada indefinidamente. Next conserva la caché
// con `signal` y, en una regeneración ISR fallida, sigue sirviendo la última
// versión buena.
const PUBLIC_READ_TIMEOUT_MS = 10_000;

async function apiFetch<T>(path: string, init: ApiInit = {}) {
  const base = apiBase();
  const { timeoutMs, ...requestInit } = init;
  const res = await fetch(`${base}${path}`, {
    ...requestInit,
    headers: {
      "Content-Type": "application/json",
      ...(requestInit.headers || {}),
    },
    cache: requestInit.cache ?? "no-store",
    signal: requestInit.signal ?? (timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text.trim();
    try {
      const json = detail ? JSON.parse(detail) : null;
      const message = Array.isArray(json?.message) ? json.message.join("; ") : json?.message;
      detail = String(message || json?.error || detail || "").trim();
    } catch {}
    throw new Error(`API ${path} ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  return (await res.json()) as T;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const me = await apiFetch<{ sub: number; username: string; role: string; canViewServiceInventory: boolean }>(
      "/auth/me",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return me;
  } catch {
    return null;
  }
}

// ----- Auth actions -----
export async function loginAction(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const next = String(formData.get("next") || "/servmacso10/servicios");

  try {
    const result = await apiFetch<{
      access_token: string;
      user: { id: number; username: string; role: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    const cookieStore = await cookies();
    cookieStore.set("token", result.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
    redirect(next);
  } catch {
    redirect(`/servmacso10?error=1&next=${encodeURIComponent(next)}`);
  }
}

export async function logoutAction(formData?: FormData) {
  const cookieStore = await cookies();
  cookieStore.set("token", "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  const next = formData ? String(formData.get("next") || "") : "";
  redirect(next || "/servmacso10");
}

// ----- Users (admin only) -----
export async function listUsers() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return [] as any[];
  try {
    return await apiFetch<Array<{ id: number; username: string; role: string; canViewServiceInventory: boolean }>>(
      "/auth/users",
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    return [] as any[];
  }
}

export async function createUserAction(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const role = String(formData.get("role") || "cliente");
  const canViewServiceInventory = formData.get("canViewServiceInventory") === "on";
  try {
    const user = await apiFetch<{ id: number; username: string; role: string; canViewServiceInventory: boolean }>("/auth/register", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, password, role, canViewServiceInventory }),
    });
    return { ok: true as const, user };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo crear el usuario" };
  }
}

export async function updateUserAction(id: number, data: { username: string; role: string; password?: string; canViewServiceInventory?: boolean }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { ok: false as const, error: "Sesión vencida" };
  try {
    const user = await apiFetch<{ id: number; username: string; role: string; canViewServiceInventory: boolean }>(`/auth/users/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return { ok: true as const, user };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo editar el usuario" };
  }
}

export async function deleteUserAction(id: number) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { ok: false as const, error: "Sesión vencida" };
  try {
    await apiFetch(`/auth/users/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo eliminar el usuario" };
  }
}

// ----- Products (admin only) -----
export async function listProducts() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  return apiFetch<Array<{ id: number; tipo: string; estado: string; conCaja: boolean }>>(
    "/productos",
    { method: "GET", headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
}

export async function createProductAction(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");

  const tipo = String(formData.get("tipo") || "");
  const estado = String(formData.get("estado") || "");
  const conCaja = formData.get("conCaja") ? true : false;
  const casillero = String(formData.get("casillero") || "");
  await apiFetch("/productos", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tipo, estado, conCaja, casillero: casillero || null }),
  });
  redirect("/servmacso10/servicios");
}


// ----- Catalog admin (staging) -----
export async function listStaged(params: {
  q?: string;
  status?: string;
  page?: number;
  pageSize?: number | "all";
  pawnMode?: "sync" | "saved";
  soloTiendasPawn?: boolean;
  savedPawnOnly?: boolean;
} = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const qs = new URLSearchParams(
    Object.entries({
      q: params.q || "",
      status: params.status || "",
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
      pawnMode: params.pawnMode || "",
      soloTiendasPawn: params.soloTiendasPawn ? "1" : "",
      savedPawnOnly: params.savedPawnOnly ? "1" : "",
    }).filter(([, v]) => String(v)) as any
  ).toString();
  return apiFetch<{ items: any[]; total: number }>(`/admin/staged${qs ? `?${qs}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createManualPreventaDraft(seed?: {
  saleType?: "PREVENTA" | "VENTA_SIMPLE" | "PROMOCION" | "OFERTA";
  category?: string;
  sku?: string;
  title?: string;
  stock?: number;
  price?: number;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  const saleType = String(seed?.saleType || "PREVENTA").toUpperCase();
  const category = String(seed?.category || "otros").toLowerCase();
  const sku = String(seed?.sku || "").trim();
  const title = String(seed?.title || "Preventa").trim() || "Preventa";
  const stock = Math.max(1, Number(seed?.stock || 1) || 1);
  const price = Number(seed?.price || 0) || 0;
  try {
    return await apiFetch<{ ok: boolean; item: Record<string, unknown>; error?: string }>(`/admin/staged/manual`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        saleType,
        category,
        sku,
        title,
        stock,
        price,
      }),
    });
  } catch (error) {
    return { ok: false, item: {}, error: error instanceof Error ? error.message : "No se pudo crear el producto" };
  }
}

// `revalidate: false` cuando el guardado va seguido de publishStaged: cada
// revalidateTag dentro de una server action vuelve a renderizar todo el panel,
// y publicar ya revalida al terminar.
export async function updateStaged(id: string, patch: any, options: { revalidate?: boolean } = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  try {
    await apiFetch(`/admin/staged/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (options.revalidate !== false) revalidateTag("catalog-products");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo guardar el producto" };
  }
}

export async function deleteStaged(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/staged/${id}/delete`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: true };
}

export async function publishStaged(id: string, data: { slug?: string; mergeStagedIds?: string[]; mergeStagedSkus?: string[] }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  try {
    await apiFetch(`/admin/staged/${id}/publish`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data || {}),
    });
    revalidateTag("catalog-products");
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "No se pudo publicar el producto" };
  }
}

export async function bulkStaged(ids: string[], action: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/staged/bulk`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ ids, action }),
  });
  revalidateTag("catalog-products");
  return { ok: true };
}

// ----- Public catalog -----
export async function listCatalog(params: { category?: string } = {}) {
  const qs = new URLSearchParams(
    Object.entries({ category: params.category || "" }).filter(([, v]) => String(v)) as any
  ).toString();
  return apiFetch<{ items: any[] }>(`/catalog${qs ? `?${qs}` : ""}`, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 300, tags: ["catalog-products"] },
    timeoutMs: PUBLIC_READ_TIMEOUT_MS,
  });
}

export async function listAdminCatalog() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { items: [] as any[] };
  return apiFetch<{ items: any[] }>(`/admin/catalog`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function prepareMarketplaceBridge(data: MarketplaceData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { ok: false as const, message: "Sesión administrativa no disponible" };
  try {
    const prepared = await apiFetch<{ token: string; expiresAt: string }>("/marketplace-bridge", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return { ok: true as const, ...prepared };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "No se pudo contactar con el backend";
    const message = /API \/marketplace-bridge 404/i.test(detail)
      ? "El backend de producción todavía no tiene activa la función de Marketplace. Vuelve a desplegar el backend en Render."
      : detail;
    return { ok: false as const, message };
  }
}

export type CatalogRepairItem = {
  publicId: string;
  productId: string;
  title: string;
  sku: string;
  slug: string;
  category: string;
  price: number;
  severity: "warning" | "critical";
  updatedAt?: string;
  issues: Array<{
    code: string;
    label: string;
    severity: "warning" | "critical";
  }>;
};

export async function listCatalogRepairs() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { items: [] as CatalogRepairItem[], total: 0 };
  return apiFetch<{ items: CatalogRepairItem[]; total: number }>("/admin/catalog-repairs", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

export async function returnCatalogRepairToInventory(publicId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/contenidos");
  const result = await apiFetch<{ ok: boolean; inventoryIds: string[] }>(
    `/admin/catalog-repairs/${encodeURIComponent(publicId)}/return-to-inventory`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  revalidateTag("catalog-products");
  return result;
}

export async function recalculateInventoryMetadata() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/contenidos");
  try {
    const result = await apiFetch<{
      ok: boolean;
      total: number;
      enviados: number;
      omitidosProtegidos: number;
      errores?: Array<{ id: number; error: string }>;
    }>("/admin/recalculate-inventory-metadata", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    revalidateTag("catalog-products");
    return result;
  } catch (error) {
    return {
      ok: false,
      total: 0,
      enviados: 0,
      omitidosProtegidos: 0,
      errores: [] as Array<{ id: number; error: string }>,
      error: error instanceof Error ? error.message : "No se pudo recalcular el inventario",
    };
  }
}

export type ClientPurchase = {
  id: string;
  photoUrl: string;
  productTitle: string;
  productImageUrl?: string | null;
  category?: string | null;
  purchasedMonth?: string | null;
};

/**
 * Fotos de entregas publicadas desde el panel (ventas con foto marcada como
 * pública). Solo trae la foto y el equipo comprado: nunca datos del cliente.
 * Se renueva cada 2 minutos; si la API falla, la sección no se muestra.
 */
export async function getClientPurchases(): Promise<ClientPurchase[]> {
  const data = await apiFetch<{ items?: ClientPurchase[] }>("/catalog/client-purchases", {
    cache: "force-cache",
    next: { revalidate: 120, tags: ["client-purchases"] },
    timeoutMs: PUBLIC_READ_TIMEOUT_MS,
  }).catch(() => ({ items: [] as ClientPurchase[] }));
  return (Array.isArray(data.items) ? data.items : []).filter((item) => item?.id && item?.photoUrl && item?.productTitle);
}

export async function getHomeCatalog() {
  return apiFetch<{
    items: Array<{
      id: string;
      slug: string;
      category: string | null;
      image: string;
      title: string;
      condition: string;
      status?: string | null;
      availabilityLabel?: string;
      saleType: string;
      discount?: number;
      discountMode?: string;
      promoLabel?: string;
      price: number;
      compareAt: number | null;
      stock: number;
      processor?: string | null;
      ram?: string | null;
      storage?: string | number | null;
      batteryHealth?: string | number | null;
      batteryCycles?: string | number | null;
      detailCount?: number;
      hasConditionDetails?: boolean;
    }>;
    featured: Array<{
      id: string; slug: string; category: string | null; image: string; title: string;
      condition: string; saleType: string; price: number; compareAt: number | null;
      stock: number; status?: string | null; availabilityLabel?: string;
      processor?: string | null; ram?: string | null; storage?: string | number | null;
      batteryHealth?: string | number | null; batteryCycles?: string | number | null;
      hasConditionDetails?: boolean; images?: string[];
    }>;
    /** Promociones reales para las campañas. Opcional: el backend puede desplegarse después. */
    promotions?: Array<{
      id: string; slug: string; category: string | null; image: string; title: string;
      condition: string; saleType: string; price: number; compareAt: number | null;
      stock: number; promoLabel?: string;
    }>;
    categories: Array<{ key: string; total: number; minPrice: number | null }>;
    budgets: Array<{ key: string; category: string; label: string; min?: number; max?: number; count: number }>;
  }>("/catalog/home", {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 300, tags: ["catalog-products"] },
    timeoutMs: PUBLIC_READ_TIMEOUT_MS,
  });
}

// Comparte metadata y página en la misma renderización, incluso con timeout.
const readCatalogItem = cache(async (slug: string) => {
  return apiFetch<{ item: any }>(`/catalog/${encodeURIComponent(slug)}`, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 300, tags: ["catalog-products"] },
    timeoutMs: PUBLIC_READ_TIMEOUT_MS,
  });
});

export async function getCatalogItem(slug: string) {
  return readCatalogItem(slug);
}

export async function getCatalogComparison(slugs: string[]) {
  const items = Array.from(new Set(slugs.filter(slug => typeof slug === "string" && slug.length <= 200))).slice(0, 3);
  return apiFetch<{ items: any[] }>(`/catalog/compare?${new URLSearchParams({ items: items.join(",") })}`, { cache: "no-store", timeoutMs: PUBLIC_READ_TIMEOUT_MS });
}

// ----- Admin: unpublish one -----
/** Cambia o quita la promoción de un producto publicado (el servidor calcula el precio final). */
export async function updatePromotionAction(productId: string, body: { discount?: number; mode?: "percent" | "amount"; remove?: boolean }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { ok: false as const, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  try {
    const data = await apiFetch<{ ok: boolean; finalPrice: number | null; finalPriceWithIgv: number | null; discount: number | null; mode: string | null; saleType: string }>(
      `/admin/public/${encodeURIComponent(productId)}/promotion`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) },
    );
    // Solo la caché pública: no hace falta volver a renderizar el panel.
    revalidateTag("catalog-products");
    return { ok: true as const, data };
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/^API \S+ \d+: ?/, "") : "";
    return { ok: false as const, error: message || "No se pudo guardar la promoción" };
  }
}

export async function unpublishProduct(productId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/public/${productId}/unpublish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  revalidateTag("catalog-products");
  return { ok: true };
}

// ----- Admin: reemplazar preventa publicada con producto real de inventario -----
export async function replacePreventaWithInventory(productId: string, stagedId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/public/${productId}/replace-preventa`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ stagedId }),
  });
  revalidateTag("catalog-products");
  return { ok: true };
}

// ----- Admin: marcar como vendido -----
export async function markProductSold(
  productId: string,
  saleDate?: string,
  salePrice?: string | number,
  customer?: {
    name?: string;
    phone?: string;
    customerKind?: string;
    salePlaceType?: string;
    saleLocation?: string;
    stagedId?: string;
    exchangeRate?: string | number;
    clientPhotoUrl?: string;
  }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  try {
    const result = await apiFetch<any>(`/admin/public/${productId}/sold`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ saleDate: saleDate || null, salePrice: salePrice ?? undefined, ...(customer || {}) }),
    });
    revalidateTag("catalog-products");
    return { ...result, ok: true, error: "" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo registrar la venta" };
  }
}

// ----- Admin: vender directamente una unidad del inventario -----
export async function markStagedProductSold(
  stagedId: string,
  saleDate?: string,
  salePrice?: string | number,
  customer?: {
    name?: string;
    phone?: string;
    customerKind?: string;
    salePlaceType?: string;
    saleLocation?: string;
    exchangeRate?: string | number;
    clientPhotoUrl?: string;
  }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  try {
    const result = await apiFetch<any>(`/admin/staged/${encodeURIComponent(stagedId)}/sold`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ saleDate: saleDate || null, salePrice: salePrice ?? undefined, ...(customer || {}) }),
    });
    revalidateTag("catalog-products");
    return { ...result, ok: true, error: "" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "No se pudo registrar la venta" };
  }
}

// ----- Admin: revertir venta (volver a vender) -----
export async function unsellProduct(productId: string, saleId?: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  try {
    await apiFetch(`/admin/public/${productId}/unsell`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ saleId: saleId || null }),
    });
    revalidateTag("catalog-products");
    return { ok: true, error: "" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "No se pudo cancelar la venta",
    };
  }
}

export async function retrySaleSync(eventId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  return apiFetch<{ ok: boolean; status: string; error?: string }>(`/admin/sales-sync/${encodeURIComponent(eventId)}/retry`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ----- Admin: listar ventas -----
export async function listSales() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { items: [] as any[] };
  return apiFetch<{ items: any[] }>(`/admin/sales`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function manageSoldPhotos(productId: string, action: "cleanup" | "hold", patch: { hold?: boolean; reason?: string } = {}) {
  const token = (await cookies()).get("token")?.value;
  if (!token) throw new Error("Debes iniciar sesión");
  const result = await apiFetch<{ ok: boolean; removed?: number; skipped?: string }>(`/admin/public/${encodeURIComponent(productId)}/photos/${action}`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(patch),
  });
  revalidateTag("catalog-products");revalidateTag("catalog-staged");
  return result;
}

export async function planSoldPhotos(productId: string) {
  const token = (await cookies()).get("token")?.value;
  if (!token) throw new Error("Debes iniciar sesión");
  return apiFetch<{ secondaryCount: number }>(`/admin/public/${encodeURIComponent(productId)}/photos/plan`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function updateSale(
  saleId: string,
  patch: {
    saleDate?: string;
    salePrice?: string | number;
  }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  return apiFetch<{ ok: boolean; item: any }>(`/admin/sales/${encodeURIComponent(saleId)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
}

/** Cambia, quita u oculta la foto del cliente de una venta ya registrada. */
export async function updateSaleClientPhoto(saleId: string, body: { clientPhotoUrl?: string; public?: boolean; remove?: boolean }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  return apiFetch<{ ok: boolean; item: { id: string; client_photo_url: string | null; client_photo_public: boolean; product_image_url: string | null } }>(
    `/admin/sales/${encodeURIComponent(saleId)}/client-photo`,
    { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(body) },
  );
}

export async function listContactRequests() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { items: [] as any[] };
  return apiFetch<{ items: any[] }>(`/admin/contact-requests`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function markContactRequestAttended(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { ok: false };
  return apiFetch<{ ok: boolean; item?: any }>(`/admin/contact-requests/${encodeURIComponent(id)}/attended`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listPossibleClients() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { items: [] as any[] };
  return apiFetch<{ items: any[] }>(`/admin/possible-clients`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function discardPossibleClient(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { ok: false };
  return apiFetch<{ ok: boolean }>(`/admin/possible-clients/${encodeURIComponent(id)}/discard`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updatePossibleClient(id: string, data: Record<string, unknown>) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { ok: false };
  return apiFetch<{ ok: boolean; item?: any }>(`/admin/possible-clients/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data || {}),
  });
}

export async function markPossibleClientPurchased(id: string, data: { customerKind: string; salePlaceType: string; saleLocation?: string; clientPhotoUrl?: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { ok: false };
  return apiFetch<{ ok: boolean; item?: any }>(`/admin/possible-clients/${encodeURIComponent(id)}/purchase`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data || {}),
  });
}

export async function getCatalogAnalytics(days = 30) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { days, summary: { totalViews: 0, uniqueVisitors: 0, categoriesCount: 0, productsCount: 0 }, categories: [] as any[] };
  return apiFetch<{
    days: number;
    summary: {
      totalViews: number;
      uniqueVisitors: number;
      categoriesCount: number;
      productsCount: number;
    };
    categories: any[];
  }>(`/admin/analytics/views?days=${encodeURIComponent(String(days))}`, { headers: { Authorization: `Bearer ${token}` } });
}




