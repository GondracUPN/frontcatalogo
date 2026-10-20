import { isHex, resolveCampaign, type ThemeDesign } from "./campaigns";

export type SiteTheme = {
  id: string;
  name: string;
  preset: string;
  colors: Record<string, string>;
  banner: { enabled: boolean; title: string; text: string; linkUrl: string; linkLabel: string; imageUrl: string; design?: Partial<ThemeDesign> };
  effect: string;
};

export const SITE_THEME_TAG = "site-theme";

function apiBase() {
  const raw = process.env.API_BASE_URL || "http://127.0.0.1:3101";
  return raw.trim().replace(/\/+$/, "");
}

/**
 * Temática vigente. Cacheada (no vuelve dinámicas las páginas públicas) y con
 * tiempo límite: ante cualquier error se muestra el diseño normal.
 */
export async function getActiveSiteTheme(): Promise<SiteTheme | null> {
  try {
    const res = await fetch(`${apiBase()}/site/theme`, {
      next: { revalidate: 300, tags: [SITE_THEME_TAG] },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { theme?: SiteTheme | null };
    return data?.theme || null;
  } catch {
    return null;
  }
}

/** Variables CSS del sitio según la campaña (acento AA sobre blanco y con texto blanco). */
export function themeCss(theme: SiteTheme | null) {
  const campaign = resolveCampaign(theme);
  if (!campaign) return "";
  const { accent, accentStrong, accentSoft } = campaign.site;
  if (![accent, accentStrong, accentSoft].every(isHex)) return "";
  return `:root{--accent:${accent};--accent-strong:${accentStrong};--accent-soft:${accentSoft};}`;
}

const EFFECTS = ["none", "snow", "hearts", "confetti", "pumpkins", "stars", "flags", "flowers", "sun"];
const str = (value: unknown, max: number) => String(value ?? "").slice(0, max);
const link = (value: unknown) => {
  const raw = str(value, 500).trim();
  return (raw.startsWith("/") && !raw.startsWith("//") && !raw.includes("\\")) || /^https:\/\/[^\s"'<>]+$/i.test(raw) ? raw : "";
};
const image = (value: unknown) => {
  const raw = str(value, 500).trim();
  return /^\/uploads\/[\w./-]+$/i.test(raw) || /^https:\/\/[^\s"'<>()]+$/i.test(raw) ? raw : "";
};

/**
 * Normaliza una temática que llega por postMessage (borrador del panel) con las
 * mismas reglas que el backend: textos acotados, colores #RRGGBB y enlaces seguros.
 */
export function sanitizeTheme(raw: unknown): SiteTheme | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, any>;
  const colors: Record<string, string> = {};
  for (const key of ["accent", "accentStrong", "accentSoft", "bannerBg", "bannerText"]) if (isHex(t.colors?.[key])) colors[key] = t.colors[key];
  const b = t.banner && typeof t.banner === "object" ? t.banner : {};
  const d = b.design && typeof b.design === "object" ? b.design : {};
  return {
    id: str(t.id, 40) || "draft",
    name: str(t.name, 80) || "Borrador",
    preset: str(t.preset, 30) || "custom",
    colors,
    banner: {
      enabled: Boolean(b.enabled),
      title: str(b.title, 80),
      text: str(b.text, 200),
      linkUrl: link(b.linkUrl),
      linkLabel: str(b.linkLabel, 30),
      imageUrl: image(b.imageUrl),
      design: {
        layout: str(d.layout, 20), font: str(d.font, 10), tone: str(d.tone, 10), motif: str(d.motif, 12),
        customColors: Boolean(d.customColors),
        surface: isHex(d.surface) ? d.surface : "", ink: isHex(d.ink) ? d.ink : "",
        imageUrl: image(d.imageUrl), mobileImageUrl: image(d.mobileImageUrl),
        imageX: Math.min(100, Math.max(0, Number(d.imageX ?? 50) || 0)), imageY: Math.min(100, Math.max(0, Number(d.imageY ?? 50) || 0)),
        eyebrow: str(d.eyebrow, 40), headline: str(d.headline, 90), subtitle: str(d.subtitle, 200),
        ctaLabel: str(d.ctaLabel, 30), ctaUrl: link(d.ctaUrl),
      },
    },
    effect: EFFECTS.includes(t.effect) ? t.effect : "none",
  };
}
