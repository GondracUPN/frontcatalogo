"use client";

function apiBase() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function setCookie(name: string, value: string, maxAgeDays = 30) {
  if (typeof document === "undefined") return;
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`;
}

const CART_ID_KEY = "cart_id";
const CART_CACHE_KEY = "cart_items_cache";
const CART_CACHE_COOKIE = "cart_items_cache";

function uuidv4() {
  const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }
  if (webCrypto?.getRandomValues) {
    const bytes = new Uint8Array(16);
    webCrypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  const rand = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${rand()}${rand()}-${rand()}-${rand()}-${rand()}-${rand()}${rand()}${rand()}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getCartId() {
  if (typeof window === "undefined") return "";
  const fromStorage = window.localStorage.getItem(CART_ID_KEY);
  if (fromStorage && isUuid(fromStorage)) {
    setCookie(CART_ID_KEY, fromStorage);
    return fromStorage;
  }
  const fromCookie = getCookie(CART_ID_KEY);
  if (fromCookie && isUuid(fromCookie)) {
    window.localStorage.setItem(CART_ID_KEY, fromCookie);
    return fromCookie;
  }
  const id = uuidv4();
  try {
    window.localStorage.setItem(CART_ID_KEY, id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] failed to persist cart id in localStorage", err);
  }
  setCookie(CART_ID_KEY, id);
  return id;
}

function fingerprintSeed() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return "";
  const parts = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    String(window.screen?.width || ""),
    String(window.screen?.height || ""),
    String(window.screen?.colorDepth || ""),
    String(Intl.DateTimeFormat().resolvedOptions().timeZone || ""),
  ];
  return parts.join("|");
}

function hashDjb2(input: string) {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
  }
  return Math.abs(hash).toString(16);
}

export function getFingerprint() {
  if (typeof window === "undefined") return "";
  const cached = window.localStorage.getItem("fp");
  if (cached) {
    setCookie("fp", cached);
    return cached;
  }
  const fromCookie = getCookie("fp") || getCookie("fingerprint");
  if (fromCookie) {
    try {
      window.localStorage.setItem("fp", fromCookie);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[offers] failed to persist fingerprint in localStorage", err);
    }
    return fromCookie;
  }
  const seed = fingerprintSeed();
  const fp = seed ? hashDjb2(seed) : globalThis.crypto?.randomUUID?.() || String(Date.now());
  window.localStorage.setItem("fp", fp);
  setCookie("fp", fp);
  return fp;
}

export function getCachedCartItems() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] invalid cart cache in localStorage", err);
  }
  const cookieRaw = getCookie(CART_CACHE_COOKIE);
  if (!cookieRaw) return [];
  try {
    const parsed = JSON.parse(cookieRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] invalid cart cache cookie", err);
    return [];
  }
}

export function persistCartItemsCache(items: any[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_CACHE_KEY, JSON.stringify(items || []));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] failed to persist cart cache in localStorage", err);
  }
  try {
    const compact = (Array.isArray(items) ? items : []).map((it) => ({
      id: it?.id,
      product_id: it?.product_id,
      qty: it?.qty,
      offer_price: it?.offer_price ?? null,
    }));
    const encoded = JSON.stringify(compact);
    if (encoded.length < 3500) {
      setCookie(CART_CACHE_COOKIE, encoded, 30);
    } else {
      // eslint-disable-next-line no-console
      console.warn("[cart] cart cache too large for cookie, skipping cookie persist");
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] failed to persist cart cache cookie", err);
  }
}

async function cartFetch<T>(path: string, init: RequestInit = {}) {
  const cartId = getCartId();
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "x-cart-id": cartId,
        ...(init.headers || {}),
      },
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] fetch failed", { path, cartId, err });
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error("[cart] endpoint error", { path, cartId, status: res.status, text });
    throw new Error(text || `cart ${res.status}`);
  }
  try {
    return (await res.json()) as T;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] invalid json response", { path, cartId, err });
    throw err;
  }
}

export async function addToCart(productId: string, qty = 1, offerPrice?: number) {
  const res = await cartFetch<{ ok: boolean; item: any }>("/cart/items", {
    method: "POST",
    body: JSON.stringify({ productId, qty, offerPrice }),
  });
  try {
    const after = await listCartItems();
    const exists = (after.items || []).some((it) => String(it?.product_id || "") === String(productId));
    if (!exists) {
      // eslint-disable-next-line no-console
      console.error("[cart] item not found after save", { productId, cartId: getCartId() });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] failed to validate cart after add", err);
  }
  return res;
}

export async function listCartItems() {
  try {
    const res = await cartFetch<{ items: any[] }>("/cart", { method: "GET" });
    persistCartItemsCache(res.items || []);
    return res;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[cart] failed to list items, using cache", err);
    return { items: getCachedCartItems() };
  }
}

export async function updateCartItem(id: string, qty: number) {
  return cartFetch<{ ok: boolean; item?: any }>(`/cart/items/${id}`, {
    method: "PUT",
    body: JSON.stringify({ qty }),
  });
}

export async function removeCartItem(id: string) {
  return cartFetch<{ ok: boolean }>(`/cart/items/${id}`, {
    method: "DELETE",
    body: JSON.stringify({}),
  });
}

export async function submitContactRequest(payload: {
  name: string;
  phone: string;
  locationScope: "lima" | "provincia";
  locationValue: string;
}) {
  return cartFetch<{ ok: boolean; id?: string | null }>("/cart/contact-request", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getOfferStatus(productId: string) {
  const cartId = getCartId();
  const fingerprint = getFingerprint();
  const res = await fetch(`${apiBase()}/offers/status?productId=${encodeURIComponent(productId)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-cart-id": cartId,
      "x-fingerprint": fingerprint,
    },
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `offer ${res.status}`);
  }
  return (await res.json()) as { blocked: boolean; attempts: number; attemptsRemaining: number };
}

export async function submitOffer(productId: string, offer: number) {
  const cartId = getCartId();
  const fingerprint = getFingerprint();
  const res = await fetch(`${apiBase()}/offers/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cart-id": cartId,
      "x-fingerprint": fingerprint,
    },
    body: JSON.stringify({ productId, offer }),
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `offer ${res.status}`);
  }
  return (await res.json()) as { ok: boolean; blocked: boolean; attemptsRemaining: number; item?: any };
}
