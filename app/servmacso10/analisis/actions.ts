"use server";

import { cookies } from "next/headers";
import type { SalesSummary, SalesTimeline, SalesProducts, SalesChannels, SalesStock, Sellers } from "./sales-types";

function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(path: string): Promise<Result<T>> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  try {
    const res = await fetch(`${apiBase()}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {}
    if (!res.ok) {
      if (res.status === 401) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
      if (res.status === 403) return { ok: false, error: "No tienes permiso para ver los análisis." };
      return { ok: false, error: res.status >= 500 ? "No se pudieron calcular los datos. Inténtalo de nuevo." : String(json?.message || `Error ${res.status}`) };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}

const qs = (params: Record<string, string>) => new URLSearchParams(params).toString();

export async function overviewAction(from: string, to: string, group: string) {
  return call<any>(`/admin/analytics/overview?${qs({ from, to, group })}`);
}
export async function productsAction(from: string, to: string) {
  return call<any>(`/admin/analytics/products?${qs({ from, to })}`);
}
export async function searchesAction(from: string, to: string) {
  return call<any>(`/admin/analytics/searches?${qs({ from, to })}`);
}
export async function funnelAction(from: string, to: string) {
  return call<any>(`/admin/analytics/funnel?${qs({ from, to })}`);
}
export async function sourcesAction(from: string, to: string) {
  return call<any>(`/admin/analytics/sources?${qs({ from, to })}`);
}

export async function salesSummaryAction(from: string, to: string, owner: string) {
  return call<SalesSummary>(`/admin/analytics/sales/summary?${qs({from,to,owner})}`);
}
export async function salesTimelineAction(from: string, to: string, owner: string, group: string) {
  return call<SalesTimeline>(`/admin/analytics/sales/timeline?${qs({from,to,owner,group})}`);
}
export async function salesProductsAction(from: string, to: string, owner: string) {
  return call<SalesProducts>(`/admin/analytics/sales/products?${qs({from,to,owner})}`);
}
export async function salesChannelsAction(from: string, to: string, owner: string) {
  return call<SalesChannels>(`/admin/analytics/sales/channels?${qs({from,to,owner})}`);
}
export async function salesStockAction(owner: string) {
  return call<SalesStock>(`/admin/analytics/sales/stock?${qs({owner})}`);
}
export async function sellersAction(from: string, to: string) {
  return call<Sellers>(`/admin/analytics/sellers?${qs({from,to})}`);
}
