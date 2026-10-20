"use server";

import { cookies } from "next/headers";
import { revalidateTag } from "next/cache";
import { SITE_THEME_TAG } from "@/lib/site-theme";
import type { ThemeDesign } from "@/lib/campaigns";

function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

export type AdminTheme = {
  id: string;
  name: string;
  preset: string;
  mode: "scheduled" | "on" | "off";
  starts_at: string | null;
  ends_at: string | null;
  recurring_yearly: boolean;
  priority: number;
  colors: Record<string, string>;
  banner: { enabled?: boolean; title?: string; text?: string; linkUrl?: string; linkLabel?: string; imageUrl?: string; design?: Partial<ThemeDesign> };
  effect: string;
  updated_by: string | null;
  updated_at: string;
};

export type ThemePreset = {
  preset: string;
  name: string;
  effect: string;
  colors: Record<string, string>;
  banner: { enabled: boolean; title: string; text: string; linkUrl: string; linkLabel: string; imageUrl: string };
  recurringYearly: boolean;
  startsAt: string | null;
  endsAt: string | null;
  datesNote: string;
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function call<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(init.headers || {}) },
      cache: "no-store",
    });
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) {
      const message = Array.isArray(json?.message) ? json.message.join("; ") : json?.message;
      if (res.status === 401) return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
      if (res.status === 403) return { ok: false, error: "No tienes permiso para esta acción." };
      return { ok: false, error: String(message || `Error ${res.status}`) };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo otra vez." };
  }
}

export async function listThemesAction() {
  return call<{ items: AdminTheme[]; activeId: string | null }>("/admin/themes");
}

export async function listPresetsAction(year: number) {
  return call<{ year: number; items: ThemePreset[] }>(`/admin/themes/presets?year=${encodeURIComponent(String(year))}`);
}

export async function saveThemeAction(id: string | null, payload: Record<string, unknown>) {
  const result = await call<{ ok: boolean; item: AdminTheme }>(id ? `/admin/themes/${id}` : "/admin/themes", {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(payload),
  });
  // La web pública muestra el cambio en la siguiente carga.
  if (result.ok) revalidateTag(SITE_THEME_TAG);
  return result;
}

export async function deleteThemeAction(id: string) {
  const result = await call<{ ok: boolean }>(`/admin/themes/${id}/delete`, { method: "POST" });
  if (result.ok) revalidateTag(SITE_THEME_TAG);
  return result;
}
