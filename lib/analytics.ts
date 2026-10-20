"use client";

import { hasConsent } from "./consent";

export type CatalogEvent =
  | "page_view"
  | "view_home"
  | "view_category"
  | "search_product"
  | "apply_filter"
  | "view_product"
  | "product_leave"
  | "select_variant"
  | "compare_product"
  | "add_to_cart"
  | "start_order_request"
  | "complete_order_request"
  | "click_whatsapp";

type Details = Record<string, string | number | boolean | string[] | undefined | null>;

// Nunca se envían datos de contacto. Sin consentimiento analítico los eventos
// van sin identificadores: solo suman a los totales agregados.
const SESSION_KEY = "ms_session";
const VISITOR_KEY = "ms_visitor";
const SESSION_TTL_MS = 30 * 60 * 1000;
const FLUSH_MS = 2500;

const queue: Array<Record<string, unknown>> = [];
let timer: number | null = null;
let listening = false;

function apiBase() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const base = raw.trim().replace(/\/+$/, "");
  if (base) return base;
  return process.env.NODE_ENV !== "production" ? "http://127.0.0.1:3101" : "";
}

function randomId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Identificadores aleatorios, solo si el visitante aceptó las analíticas. */
function identifiers() {
  if (!hasConsent("analytics")) return { consent: false as const };
  try {
    let visitorId = window.localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = randomId();
      window.localStorage.setItem(VISITOR_KEY, visitorId);
    }
    const now = Date.now();
    const stored = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "null");
    const sessionId = stored && now - Number(stored.last) < SESSION_TTL_MS ? String(stored.id) : randomId();
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: sessionId, last: now }));
    return { consent: true as const, sessionId, visitorId };
  } catch {
    return { consent: true as const };
  }
}

function device() {
  const width = window.innerWidth;
  return width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

function flush() {
  if (timer !== null) {
    window.clearTimeout(timer);
    timer = null;
  }
  if (!queue.length) return;
  const base = apiBase();
  const events = queue.splice(0, 25);
  if (!base) return;
  // keepalive: el envío termina aunque el visitante cierre o cambie de página.
  fetch(`${base}/site/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...identifiers(), events }),
    keepalive: true,
  }).catch(() => {});
  if (queue.length) flush();
}

function ensureListeners() {
  if (listening) return;
  listening = true;
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

const FIELD_MAP: Record<string, string> = {
  product_id: "productId",
  product_slug: "productSlug",
  category: "category",
  query: "query",
  results: "results",
  filters: "filters",
  duration_ms: "durationMs",
};

/**
 * Vistas previas de temáticas (panel, ?theme_preview, demo): no cuentan visitas.
 * Dentro del iframe del panel se recuerda aunque se navegue a otra página.
 */
export function isThemePreviewContext() {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const byUrl = ["theme_preview", "theme_draft", "theme_demo"].some((key) => params.has(key));
  try {
    if (byUrl && window.parent !== window) window.sessionStorage.setItem("ms-theme-preview", "1");
    return byUrl || (window.parent !== window && window.sessionStorage.getItem("ms-theme-preview") === "1");
  } catch {
    return byUrl;
  }
}

export function trackCatalogEvent(event: CatalogEvent, details: Details = {}) {
  if (isThemePreviewContext()) return;
  if (typeof window === "undefined") return;
  // El panel interno no cuenta como tráfico de clientes.
  if (window.location.pathname.startsWith("/servmacso10")) return;
  window.dispatchEvent(new CustomEvent("macsomenos:analytics", { detail: { event, ...details } }));
  const dataLayer = (window as Window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
  dataLayer?.push({ event, ...details });

  const payload: Record<string, unknown> = { type: event, at: new Date().toISOString(), path: window.location.pathname, device: device() };
  for (const [key, value] of Object.entries(details)) {
    if (value === undefined || value === null) continue;
    payload[FIELD_MAP[key] || key] = value;
  }
  queue.push(payload);
  ensureListeners();
  if (queue.length >= 20) flush();
  else if (timer === null) timer = window.setTimeout(flush, FLUSH_MS);
}

let landingSent = false;

/** Vista de página. La primera de la visita lleva la procedencia (referente, UTM, gclid). */
export function trackPageView() {
  if (isThemePreviewContext()) return;
  if (typeof window === "undefined") return;
  const details: Details = {};
  if (!landingSent) {
    landingSent = true;
    const params = new URLSearchParams(window.location.search);
    let referrerHost = "";
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {}
    // Venir de otra página de la misma tienda no es una procedencia externa.
    if (referrerHost === window.location.hostname) referrerHost = "";
    details.landing = true;
    details.referrerHost = referrerHost || null;
    details.utmSource = params.get("utm_source");
    details.utmMedium = params.get("utm_medium");
    details.utmCampaign = params.get("utm_campaign");
    details.gclid = params.has("gclid") || params.has("gbraid") || params.has("wbraid");
  }
  trackCatalogEvent("page_view", details);
}
