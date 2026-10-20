"use client";

import React from "react";
import { isThemePreviewContext, trackCatalogEvent } from "@/lib/analytics";
import { CONSENT_EVENT, hasConsent } from "@/lib/consent";

type Props = {
  productId: string;
  productSlug: string;
  productTitle: string;
  category?: string | null;
};

const SESSION_KEY = "catalog_view_session_id";
const VIEW_PREFIX = "catalog_view_seen_";
const VIEW_TTL_MS = 30 * 60 * 1000;

function apiBase() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const base = raw.trim().replace(/\/+$/, "");
  if (base) return base;
  if (process.env.NODE_ENV !== "production") return "http://127.0.0.1:3101";
  return "";
}

function getSessionId() {
  if (typeof window === "undefined") return "";
  const current = window.localStorage.getItem(SESSION_KEY);
  if (current) return current;
  const next = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(SESSION_KEY, next);
  return next;
}

export default function ProductViewTracker({ productId, productSlug, productTitle, category }: Props) {
  // Solo se registra la vista si el visitante aceptó las cookies analíticas.
  const [allowed, setAllowed] = React.useState(false);
  React.useEffect(() => {
    const sync = () => setAllowed(hasConsent("analytics"));
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  // Vista y tiempo en la ficha: se cuentan siempre de forma agregada (sin
  // identificadores si no hay consentimiento; ver lib/analytics).
  React.useEffect(() => {
    if (!productId) return;
    trackCatalogEvent("view_product", { product_id: productId, product_slug: productSlug, category: category || "" });
    const startedAt = Date.now();
    let sent = false;
    const leave = () => {
      if (sent) return;
      sent = true;
      trackCatalogEvent("product_leave", { product_id: productId, duration_ms: Date.now() - startedAt });
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [category, productId, productSlug]);

  // Registro anterior de vistas (panel «Vistas»): solo con consentimiento analítico.
  React.useEffect(() => {
    if (typeof window === "undefined" || !allowed || !productId || !productSlug || isThemePreviewContext()) return;

    const key = `${VIEW_PREFIX}${productId}`;
    const lastSentAt = Number(window.localStorage.getItem(key) || 0);
    if (lastSentAt && Date.now() - lastSentAt < VIEW_TTL_MS) return;

    const sessionId = getSessionId();
    const payload = JSON.stringify({
      productId,
      productSlug,
      productTitle,
      category: category || "",
      sessionId,
      path: window.location.pathname,
    });

    window.localStorage.setItem(key, String(Date.now()));

    const base = apiBase();
    if (!base) return;

    fetch(`${base}/catalog/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  }, [allowed, category, productId, productSlug, productTitle]);

  return null;
}
