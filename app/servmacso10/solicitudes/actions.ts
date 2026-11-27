"use server";

import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";

function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(path: string, init: RequestInit = {}): Promise<ActionResult<T>> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
      cache: "no-store",
    });
    const text = await res.text();
    let json: any = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {}
    if (!res.ok) {
      if (res.status === 401) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
      if (res.status === 403) return { ok: false, error: "No tienes permiso para esta acción." };
      const message = Array.isArray(json?.message) ? json.message.join("; ") : json?.message;
      return { ok: false, error: res.status >= 500 ? "Error del servidor. Inténtalo de nuevo." : String(message || `Error ${res.status}`) };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor." };
  }
}

const enc = encodeURIComponent;

// ----- Solicitudes -----
export async function listRequestsAction(params: { status?: string; q?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.q) qs.set("q", params.q);
  qs.set("page", String(params.page || 1));
  return call<{ items: any[]; total: number; counts: Record<string, number> }>(`/admin/purchase-requests?${qs}`);
}

export async function requestDetailAction(id: string) {
  return call<any>(`/admin/purchase-requests/${enc(id)}`);
}

export async function changeRequestStatusAction(id: string, body: { to: string; expectedStatus: string; note?: string; paymentMethod?: string; cancelReason?: string }) {
  const result = await call<any>(`/admin/purchase-requests/${enc(id)}/status`, { method: "POST", body: JSON.stringify(body) });
  // Reservar, liberar o cerrar una solicitud cambia el stock público: el
  // catálogo y las fichas en caché se regeneran al momento.
  if (result.ok) revalidateTag("catalog-products");
  return result;
}

// ----- Entrega -----
export async function listDeliveryOptionsAction() {
  return call<{ items: any[] }>("/admin/delivery/options");
}

export async function saveDeliveryOptionAction(id: string | null, body: Record<string, unknown>) {
  return call<{ ok: boolean; item: any }>(id ? `/admin/delivery/options/${enc(id)}` : "/admin/delivery/options", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(body),
  });
}

export async function listDeliveryPointsAction() {
  return call<{ items: any[] }>("/admin/delivery/points");
}

export async function saveDeliveryPointAction(id: string | null, body: Record<string, unknown>) {
  return call<{ ok: boolean; item?: any; needsConfirmation?: boolean; suggestions?: Array<{ id: string; name: string; score: number }> }>(
    id ? `/admin/delivery/points/${enc(id)}` : "/admin/delivery/points",
    { method: id ? "PUT" : "POST", body: JSON.stringify(body) },
  );
}

export async function addPointAliasAction(id: string, alias: string) {
  return call<{ ok: boolean; item: any }>(`/admin/delivery/points/${enc(id)}/aliases`, { method: "POST", body: JSON.stringify({ alias }) });
}

export async function unmatchedLocationsAction() {
  return call<{ items: Array<{ text: string; count: number; suggestions: Array<{ id: string; name: string; score: number }> }> }>("/admin/delivery/unmatched");
}

export async function deliveryStatsAction(from: string, to: string) {
  return call<{ from: string; to: string; totals: { chosen: number; delivered: number }; items: any[] }>(
    `/admin/delivery/stats?from=${enc(from)}&to=${enc(to)}`,
  );
}

// ----- Agenda de citas -----
export type Appointment = {
  id: string;
  customer_name: string | null;
  customer_contact: string;
  product_id: string | null;
  product_title: string;
  sku: string | null;
  scheduled_at: string;
  note: string | null;
  status: "scheduled" | "done" | "cancelled";
  source_request_id: string | null;
  reminders: Record<"day_before" | "same_day", { state: string; dueAt?: string; reason?: string; lastError?: string | null }>;
};

export type AppointmentInput = {
  customerName?: string;
  customerContact: string;
  productId?: string | null;
  productTitle: string;
  sku?: string;
  scheduledAt: string;
  note?: string;
  sourceRequestId?: string | null;
};

export async function listAppointmentsAction(params: { status?: string; from?: string } = {}) {
  const qs = new URLSearchParams();
  qs.set("status", params.status || "scheduled");
  if (params.from) qs.set("from", params.from);
  return call<{ items: Appointment[]; remindersEnabled?: boolean }>(`/admin/appointments?${qs}`);
}

export async function saveAppointmentAction(id: string | null, body: Partial<AppointmentInput>) {
  return call<Appointment>(id ? `/admin/appointments/${enc(id)}` : "/admin/appointments", {
    method: id ? "PATCH" : "POST",
    body: JSON.stringify(body),
  });
}

export async function changeAppointmentStatusAction(id: string, status: "scheduled" | "done" | "cancelled") {
  return call<Appointment>(`/admin/appointments/${enc(id)}/status`, { method: "POST", body: JSON.stringify({ status }) });
}

export type AppointmentProduct = { id: string; title: string; sku: string; status: string; catalogProductId: string | null };

/** Busca productos (borradores y publicados, sin vendidos/ocultos) para autocompletar la cita. */
export async function searchAppointmentProductsAction(q: string) {
  const term = q.trim();
  if (term.length < 2) return { ok: true as const, data: { items: [] as AppointmentProduct[] } };
  const result = await call<{ items: any[] }>(`/admin/appointments/products?${new URLSearchParams({ q: term })}`);
  if (!result.ok) return result;
  return {
    ok: true as const,
    data: {
      items: (result.data.items || []).map((item): AppointmentProduct => ({
        id: String(item.id),
        title: String(item.title || ""),
        sku: String(item.sku || ""),
        status: String(item.status || ""),
        catalogProductId: item.catalog_product_id ? String(item.catalog_product_id) : null,
      })),
    },
  };
}
