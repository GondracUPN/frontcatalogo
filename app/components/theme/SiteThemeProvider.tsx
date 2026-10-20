"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { sanitizeTheme, themeCss, type SiteTheme } from "@/lib/site-theme";
import { CAMPAIGNS, resolveCampaign, type ResolvedCampaign } from "@/lib/campaigns";
import { MotifGlyph } from "../campaign/motifs";

const ThemeEffects = dynamic(() => import("./ThemeEffects"), { ssr: false });

/** live: la vigente · preview: una guardada · draft: borrador del panel · demo: solo desarrollo. */
export type ThemeMode = "live" | "preview" | "draft" | "demo";

const SiteThemeContext = React.createContext<{ theme: SiteTheme | null; campaign: ResolvedCampaign | null; mode: ThemeMode }>({ theme: null, campaign: null, mode: "live" });

/** Temática vigente (o la de vista previa) para los componentes que se decoran. */
export function useSiteTheme() {
  return React.useContext(SiteThemeContext).theme;
}

/** Campaña resuelta (diseño + ajustes del panel) o null sin temática. */
export function useCampaign() {
  return React.useContext(SiteThemeContext).campaign;
}

export function useThemeMode() {
  return React.useContext(SiteThemeContext).mode;
}

export const DRAFT_MESSAGE = "ms-theme-draft";
export const DRAFT_READY = "ms-theme-draft-ready";

function demoTheme(params: URLSearchParams): SiteTheme | null {
  const preset = params.get("theme_demo") || "";
  const campaign = CAMPAIGNS[preset];
  if (!campaign) return null;
  let design: unknown = {};
  try { design = JSON.parse(params.get("theme_design") || "{}"); } catch {}
  return sanitizeTheme({
    id: `demo-${preset}`,
    name: campaign.copy.eyebrow,
    preset,
    colors: {},
    banner: { enabled: true, title: campaign.copy.eyebrow, text: campaign.copy.text, linkUrl: campaign.copy.ctaUrl, linkLabel: campaign.copy.cta, imageUrl: "", design },
    effect: params.get("theme_effect") || "none",
  });
}

export default function SiteThemeProvider({ initialTheme, children }: { initialTheme: SiteTheme | null; children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<SiteTheme | null>(initialTheme);
  const [mode, setMode] = React.useState<ThemeMode>("live");
  const [hidden, setHidden] = React.useState(false);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Borrador sin guardar: solo dentro del iframe del panel y desde el mismo origen.
    if (params.has("theme_draft") && window.parent !== window) {
      const onMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin || event.source !== window.parent) return;
        if (event.data?.type !== DRAFT_MESSAGE) return;
        setTheme(event.data.theme === null ? null : sanitizeTheme(event.data.theme));
        setMode("draft");
      };
      window.addEventListener("message", onMessage);
      window.parent.postMessage({ type: DRAFT_READY }, window.location.origin);
      return () => window.removeEventListener("message", onMessage);
    }

    // Solo en desarrollo: ?theme_demo=<preset> para revisar y capturar cada campaña.
    if (process.env.NODE_ENV !== "production" && params.has("theme_demo")) {
      setTheme(demoTheme(params));
      setMode("demo");
      return;
    }

    // Vista previa de una temática guardada: ?theme_preview=<id>. Se pide al
    // servidor de Next (API_BASE_URL) para no depender de variables públicas.
    const id = params.get("theme_preview");
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return;
    let cancelled = false;
    fetch(`/api/site-theme/${id}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.theme) {
          setTheme(sanitizeTheme(data.theme));
          setMode("preview");
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const campaign = React.useMemo(() => resolveCampaign(theme), [theme]);

  // El panel interno no lleva decoraciones de temporada (aviso ni partículas).
  const pathname = usePathname();
  const inAdmin = pathname?.startsWith("/servmacso10") ?? false;
  const banner = theme?.banner;
  const showBanner = Boolean(theme && campaign && !inAdmin && banner?.enabled && (banner.title || banner.text) && !hidden);
  const css = themeCss(theme);
  const value = React.useMemo(() => ({ theme, campaign, mode }), [theme, campaign, mode]);

  return (
    <SiteThemeContext.Provider value={value}>
      {css && <style>{css}</style>}
      {(mode === "preview" || mode === "demo") && theme && (
        <div className="bg-amber-300 px-3 py-1.5 text-center text-xs font-semibold text-amber-950">
          Vista previa de la temática «{theme.name}». Los visitantes no la ven hasta que esté activa.
        </div>
      )}
      {showBanner && campaign && banner && (
        <div className="relative px-11 py-2.5 text-center text-sm" style={{ background: campaign.banner.bg, color: campaign.banner.text }}>
          <div className="mx-auto flex max-w-5xl items-center justify-center gap-2.5">
            <MotifGlyph motif={campaign.motif} className="hidden h-4 w-4 shrink-0 sm:block" />
            <p className="min-w-0">
              {banner.title && <strong className="font-semibold">{banner.title}</strong>}
              {banner.title && banner.text ? " · " : ""}
              {banner.text}
              {banner.linkUrl && (
                <>
                  {" "}
                  <Link href={banner.linkUrl} className="whitespace-nowrap font-semibold underline underline-offset-2">
                    {banner.linkLabel || "Ver más"}
                  </Link>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setHidden(true)}
            aria-label="Cerrar aviso"
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-lg opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-current"
          >
            ×
          </button>
        </div>
      )}
      {children}
      {!inAdmin && theme?.effect && theme.effect !== "none" && <ThemeEffects effect={theme.effect} />}
    </SiteThemeContext.Provider>
  );
}
