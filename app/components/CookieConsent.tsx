"use client";

import React from "react";
import Link from "next/link";
import Script from "next/script";
import { isThemePreviewContext } from "@/lib/analytics";
import {
  CONSENT_EVENT,
  NO_OPTIONAL_CONSENT,
  OPEN_CONSENT_EVENT,
  readConsent,
  saveConsent,
  type ConsentChoices,
  type ConsentRecord,
} from "@/lib/consent";

const GOOGLE_ADS_ID = "AW-18491059831";

const CATEGORIES: Array<{ key: keyof ConsentChoices | "necessary"; title: string; description: string }> = [
  {
    key: "necessary",
    title: "Necesarias",
    description: "Hacen posible el carrito y el funcionamiento básico del sitio. Siempre activas.",
  },
  {
    key: "analytics",
    title: "Análisis",
    description: "Nos ayudan a entender cómo se usa el sitio para mejorar el catálogo.",
  },
  {
    key: "preferences",
    title: "Preferencias",
    description: "Recuerdan ajustes opcionales de visualización.",
  },
  {
    key: "marketing",
    title: "Marketing",
    description: "Colaboran con nuestros estudios de marketing y la medición de campañas.",
  },
];

export default function CookieConsent() {
  const [consent, setConsent] = React.useState<ConsentRecord | null>(null);
  const [ready, setReady] = React.useState(false);
  // Dentro de la vista previa del panel el aviso taparía la página que se revisa.
  const [inPreview, setInPreview] = React.useState(false);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ConsentChoices>(NO_OPTIONAL_CONSENT);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setConsent(readConsent());
    setInPreview(isThemePreviewContext());
    setReady(true);
    const open = () => {
      const current = readConsent();
      setDraft(current ? { analytics: current.analytics, preferences: current.preferences, marketing: current.marketing } : NO_OPTIONAL_CONSENT);
      setPanelOpen(true);
    };
    const changed = (event: Event) => setConsent((event as CustomEvent<ConsentRecord>).detail);
    window.addEventListener(OPEN_CONSENT_EVENT, open);
    window.addEventListener(CONSENT_EVENT, changed);
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, open);
      window.removeEventListener(CONSENT_EVENT, changed);
    };
  }, []);

  React.useEffect(() => {
    if (!panelOpen) return;
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelOpen]);

  const decide = (choices: ConsentChoices) => {
    setConsent(saveConsent(choices));
    setPanelOpen(false);
  };

  const showBanner = ready && !consent && !panelOpen && !inPreview;
  const buttonBase = "min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";
  const mainButton = `${buttonBase} bg-[color:var(--foreground)] text-white hover:opacity-90`;
  const compactButton = "min-h-11 flex-1 rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] sm:flex-none";
  const secondaryButton = `${buttonBase} border border-black/15 bg-white text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)]`;

  return (
    <>
      {consent?.marketing && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`} strategy="afterInteractive" />
          <Script id="google-ads-tag" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
          </Script>
        </>
      )}

      {showBanner && (
        <div
          role="region"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-[60] px-2 pb-[max(8px,env(safe-area-inset-bottom))] sm:px-4 sm:pb-4"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 rounded-2xl border border-black/10 bg-white/95 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:flex-row sm:items-center sm:gap-5">
            <p className="text-xs leading-5 text-[color:var(--foreground-soft)] sm:flex-1">
              Usamos cookies para que tu visita sea más fluida, entender cómo se usa la tienda y mejorar nuestras
              campañas. Si pulsas «Aceptar», nos das tu permiso; también puedes elegir cuáles permitir.{" "}
              <Link href="/cookies" className="font-medium text-[color:var(--foreground)] underline underline-offset-2">Ver política de cookies</Link>
            </p>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                className={`${compactButton} border border-black/15 bg-white text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)]`}
                onClick={() => {
                  setDraft(NO_OPTIONAL_CONSENT);
                  setPanelOpen(true);
                }}
              >
                Configurar
              </button>
              <button
                type="button"
                className={`${compactButton} border border-black/15 bg-white text-[color:var(--foreground)] hover:bg-[color:var(--surface-muted)]`}
                onClick={() => decide(NO_OPTIONAL_CONSENT)}
              >
                Rechazar
              </button>
              <button
                type="button"
                className={`${compactButton} bg-[color:var(--foreground)] text-white hover:opacity-90`}
                onClick={() => decide({ analytics: true, preferences: true, marketing: true })}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-3 sm:items-center" onClick={() => setPanelOpen(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-panel-title"
            className="flex max-h-[min(640px,calc(100dvh-24px))] w-full max-w-lg flex-col overflow-hidden rounded-[22px] bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-black/8 px-5 py-4">
              <h2 id="cookie-panel-title" className="text-base font-semibold text-[color:var(--foreground)]">Configurar cookies</h2>
              <p className="mt-1 text-xs leading-5 text-[color:var(--foreground-soft)]">
                Elige qué cookies opcionales aceptas.{" "}
                <Link href="/cookies" className="text-[color:var(--accent)] underline underline-offset-2" onClick={() => setPanelOpen(false)}>Ver detalle</Link>
              </p>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {CATEGORIES.map((category) => {
                const fixed = category.key === "necessary";
                const checked = fixed ? true : draft[category.key as keyof ConsentChoices];
                const id = `consent-${category.key}`;
                return (
                  <div key={category.key} className="flex items-start gap-3 rounded-2xl border border-black/8 p-3">
                    <div className="min-w-0 flex-1">
                      <label htmlFor={id} className="text-sm font-semibold text-[color:var(--foreground)]">{category.title}</label>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--foreground-soft)]">{category.description}</p>
                    </div>
                    <input
                      id={id}
                      type="checkbox"
                      role="switch"
                      aria-checked={checked}
                      className="mt-1 h-6 w-6 shrink-0 accent-[color:var(--accent)]"
                      checked={checked}
                      disabled={fixed}
                      onChange={(event) => {
                        if (fixed) return;
                        const value = event.target.checked;
                        setDraft((current) => ({ ...current, [category.key]: value }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="grid gap-2 border-t border-black/8 px-5 py-4 sm:grid-cols-3">
              <button type="button" className={secondaryButton} onClick={() => decide(NO_OPTIONAL_CONSENT)}>
                Rechazar
              </button>
              <button type="button" className={secondaryButton} onClick={() => decide(draft)}>
                Guardar
              </button>
              <button type="button" className={mainButton} onClick={() => decide({ analytics: true, preferences: true, marketing: true })}>
                Aceptar todas
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CookiePreferencesButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
    >
      Preferencias de cookies
    </button>
  );
}
