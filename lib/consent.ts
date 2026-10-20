"use client";

// Preferencias de cookies del visitante. Las categorías opcionales empiezan
// desactivadas y solo se activan con una acción explícita del visitante.
export const CONSENT_VERSION = "2026-10-14";
export const CONSENT_COOKIE = "ms_consent";
const CONSENT_MAX_AGE_DAYS = 180;
export const CONSENT_EVENT = "macsomenos:consent";
export const OPEN_CONSENT_EVENT = "macsomenos:open-consent";

export type ConsentChoices = {
  analytics: boolean;
  preferences: boolean;
  marketing: boolean;
};

export type ConsentRecord = ConsentChoices & {
  version: string;
  decidedAt: string;
};

export const NO_OPTIONAL_CONSENT: ConsentChoices = { analytics: false, preferences: false, marketing: false };

export function readConsent(): ConsentRecord | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]*)`));
  if (!match) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    // Si cambia el aviso (versión), se vuelve a preguntar.
    if (parsed?.v !== CONSENT_VERSION) return null;
    return {
      analytics: parsed.a === 1,
      preferences: parsed.p === 1,
      marketing: parsed.m === 1,
      version: String(parsed.v),
      decidedAt: String(parsed.t || ""),
    };
  } catch {
    return null;
  }
}

export function hasConsent(category: keyof ConsentChoices) {
  return Boolean(readConsent()?.[category]);
}

// Borra cookies de terceros ya creadas cuando se retira el consentimiento.
function clearCookiesWithPrefix(prefixes: string[]) {
  const host = window.location.hostname;
  const domains = ["", host, `.${host.replace(/^www\./, "")}`];
  for (const raw of document.cookie.split("; ")) {
    const name = raw.split("=")[0];
    if (!prefixes.some((prefix) => name.startsWith(prefix))) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; path=/; max-age=0${domain ? `; domain=${domain}` : ""}`;
    }
  }
}

const ANALYTICS_STORAGE_KEYS = ["catalog_view_session_id", "ms_visitor"];
const ANALYTICS_STORAGE_PREFIXES = ["catalog_view_seen_"];

function clearAnalyticsStorage() {
  try {
    for (const key of ANALYTICS_STORAGE_KEYS) window.localStorage.removeItem(key);
    window.sessionStorage.removeItem("ms_session");
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i) || "";
      if (ANALYTICS_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) window.localStorage.removeItem(key);
    }
  } catch {}
}

export function saveConsent(choices: ConsentChoices) {
  const previous = readConsent();
  const record: ConsentRecord = { ...choices, version: CONSENT_VERSION, decidedAt: new Date().toISOString() };
  const value = encodeURIComponent(JSON.stringify({
    v: record.version,
    t: record.decidedAt,
    a: record.analytics ? 1 : 0,
    p: record.preferences ? 1 : 0,
    m: record.marketing ? 1 : 0,
  }));
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE_DAYS * 24 * 60 * 60}; samesite=lax${secure}`;

  if (!record.marketing) clearCookiesWithPrefix(["_gcl", "_ga", "_gid"]);
  if (!record.analytics) clearAnalyticsStorage();

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: record }));

  // Un script de terceros ya cargado no se puede descargar: recargar garantiza
  // que deje de ejecutarse cuando se revoca el permiso.
  if (previous?.marketing && !record.marketing) window.location.reload();
  return record;
}

export function openConsentPreferences() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}
