"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Base URL de la API Nest (sin secretos)
function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

async function apiFetch<T>(path: string, init: RequestInit = {}) {
  const base = apiBase();
  // Simple debug log to backend
  // eslint-disable-next-line no-console
  console.log(`[apiFetch] ${init.method || 'GET'} ${base}${path}`);
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error(`[apiFetch] ERROR ${res.status} ${base}${path} -> ${text}`);
    throw new Error(`API ${path} ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const me = await apiFetch<{ sub: number; username: string; role: string }>(
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
  } catch (e) {
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
    return await apiFetch<Array<{ id: number; username: string; role: string }>>(
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
  await apiFetch("/auth/register", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username, password, role }),
  });
  redirect("/servmacso10/servicios");
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
export async function listStaged(params: { q?: string; status?: string; page?: number; pageSize?: number } = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const qs = new URLSearchParams(
    Object.entries({
      q: params.q || "",
      status: params.status || "",
      page: String(params.page || 1),
      pageSize: String(params.pageSize || 20),
    }).filter(([, v]) => String(v)) as any
  ).toString();
  return apiFetch<{ items: any[]; total: number }>(`/admin/staged${qs ? `?${qs}` : ""}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

export async function createManualPreventaDraft(seed?: {
  saleType?: "PREVENTA" | "VENTA_SIMPLE" | "PROMOCION" | "OFERTA";
  category?: string;
  title?: string;
  stock?: number;
  price?: number;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  const saleType = String(seed?.saleType || "PREVENTA").toUpperCase();
  const category = String(seed?.category || "otros").toLowerCase();
  const title = String(seed?.title || "Preventa").trim() || "Preventa";
  const stock = Math.max(1, Number(seed?.stock || 1) || 1);
  const price = Number(seed?.price || 0) || 0;
  return apiFetch<{ ok: boolean; item: Record<string, unknown> }>(`/admin/staged/manual`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      saleType,
      category,
      title,
      stock,
      price,
    }),
  });
}

export async function updateStaged(id: string, patch: any) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/staged/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(patch),
  });
  return { ok: true };
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

export async function publishStaged(id: string, data: { slug?: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/staged/${id}/publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data || {}),
  });
  return { ok: true };
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
  return { ok: true };
}

// ----- Public catalog -----
export async function listCatalog(params: { category?: string } = {}) {
  const qs = new URLSearchParams(
    Object.entries({ category: params.category || "" }).filter(([, v]) => String(v)) as any
  ).toString();
  return apiFetch<{ items: any[] }>(`/catalog${qs ? `?${qs}` : ""}`, { method: "GET" });
}

export async function getCatalogItem(slug: string) {
  return apiFetch<{ item: any }>(`/catalog/${encodeURIComponent(slug)}`, { method: "GET" });
}

// ----- Admin: unpublish one -----
export async function unpublishProduct(productId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/public/${productId}/unpublish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: true };
}

// ----- Admin: marcar como vendido -----
export async function markProductSold(productId: string, saleDate?: string, salePrice?: string | number) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/public/${productId}/sold`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ saleDate: saleDate || null, salePrice: salePrice ?? undefined }),
  });
  return { ok: true };
}

// ----- Admin: revertir venta (volver a vender) -----
export async function unsellProduct(productId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/servmacso10?next=/servmacso10/servicios");
  await apiFetch(`/admin/public/${productId}/unsell`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: true };
}

// ----- Admin: listar ventas -----
export async function listSales() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { items: [] as any[] };
  return apiFetch<{ items: any[] }>(`/admin/sales`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function listContactRequests() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return { items: [] as any[] };
  return apiFetch<{ items: any[] }>(`/admin/contact-requests`, { headers: { Authorization: `Bearer ${token}` } });
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




