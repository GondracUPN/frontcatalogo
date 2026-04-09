"use client";

import React from "react";

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
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
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
  React.useEffect(() => {
    if (typeof window === "undefined" || !productId || !productSlug) return;

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

    fetch(`${apiBase()}/catalog/views`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  }, [category, productId, productSlug, productTitle]);

  return null;
}
