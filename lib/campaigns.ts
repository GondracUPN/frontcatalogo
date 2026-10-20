// Identidad visual de cada campaña. Archivo sin dependencias para que el test de
// contraste (scripts/check-theme-contrast.ts) lo importe con Node directamente.

export type CampaignLayout = "split" | "typographic" | "arch" | "spotlight" | "banded" | "deals" | "bento" | "brand" | "desk" | "horizon" | "immersive";
export type CampaignFont = "sans" | "serif" | "heavy" | "mono";
export type CampaignTone = "light" | "dark";
export type CampaignMotif = "none" | "ribbon" | "gold" | "heart" | "moon" | "andean" | "petal" | "lines" | "grid" | "leaf" | "notebook" | "sun";

export const LAYOUTS: CampaignLayout[] = ["split", "typographic", "arch", "spotlight", "banded", "deals", "bento", "brand", "desk", "horizon", "immersive"];
export const FONTS: CampaignFont[] = ["sans", "serif", "heavy", "mono"];
export const TONES: CampaignTone[] = ["light", "dark"];
export const MOTIFS: CampaignMotif[] = ["none", "ribbon", "gold", "heart", "moon", "andean", "petal", "lines", "grid", "leaf", "notebook", "sun"];

export type ThemeDesign = {
  layout: string; font: string; tone: string; motif: string;
  customColors: boolean; surface: string; ink: string;
  imageUrl: string; mobileImageUrl: string; imageX: number; imageY: number;
  eyebrow: string; headline: string; subtitle: string; ctaLabel: string; ctaUrl: string;
};

/** Colores del bloque de campaña. `accent` es el fondo del botón principal y `onAccent` su texto. */
export type Palette = { bg: string; surface: string; ink: string; inkSoft: string; accent: string; onAccent: string; line: string };

export type Campaign = {
  key: string;
  layout: CampaignLayout;
  tone: CampaignTone;
  font: CampaignFont;
  motif: CampaignMotif;
  /** Invierte texto y visual en las composiciones de dos columnas. */
  mirror?: boolean;
  palette: Palette;
  /** Acento del resto del sitio: texto sobre blanco y fondo de botones con texto blanco. */
  site: { accent: string; accentStrong: string; accentSoft: string };
  banner: { bg: string; text: string };
  copy: { eyebrow: string; title: string; text: string; cta: string; ctaUrl: string };
  /** Texto alternativo cuando no hay promociones reales publicadas (no prometer descuentos). */
  textNoPromos?: string;
  /** Categorías que la composición muestra primero (sin inventar productos). */
  prefer?: string[];
};

const OFFERS = "/ofertas";
const ALL = "/categorias";

export const CAMPAIGNS: Record<string, Campaign> = {
  navidad: {
    key: "navidad", layout: "split", tone: "dark", font: "serif", motif: "ribbon",
    palette: { bg: "#0f2e22", surface: "#163d2e", ink: "#fbf6ec", inkSoft: "#cfe0d4", accent: "#c8102e", onAccent: "#ffffff", line: "#e3b85c" },
    site: { accent: "#b3122e", accentStrong: "#8f0e25", accentSoft: "#fbe9ec" },
    banner: { bg: "#0f2e22", text: "#fbf6ec" },
    copy: { eyebrow: "Navidad en Macsomenos", title: "Este año, regala Apple.", text: "MacBook, iPhone, iPad y Apple Watch con fotos reales de cada unidad y precio con IGV.", cta: "Elegir un regalo", ctaUrl: ALL },
  },
  ano_nuevo: {
    key: "ano_nuevo", layout: "typographic", tone: "dark", font: "serif", motif: "gold",
    palette: { bg: "#0b0d14", surface: "#161a26", ink: "#f5f1e6", inkSoft: "#b9bcc8", accent: "#d9b25f", onAccent: "#1a1408", line: "#d9b25f" },
    site: { accent: "#8a5a00", accentStrong: "#6e4800", accentSoft: "#fbf3df" },
    banner: { bg: "#0b0d14", text: "#ecd49a" },
    copy: { eyebrow: "Año nuevo", title: "Año nuevo, equipo nuevo.", text: "Empieza el año con un Mac, iPhone o iPad revisado, con su batería y su precio a la vista.", cta: "Ver equipos", ctaUrl: ALL },
  },
  san_valentin: {
    key: "san_valentin", layout: "arch", tone: "light", font: "serif", motif: "heart",
    palette: { bg: "#fbf0ee", surface: "#ffffff", ink: "#3b0d1c", inkSoft: "#6e4452", accent: "#b4234f", onAccent: "#ffffff", line: "#e3a9b6" },
    site: { accent: "#b4234f", accentStrong: "#8f1a3e", accentSoft: "#fbe7ec" },
    banner: { bg: "#6b1430", text: "#ffffff" },
    copy: { eyebrow: "San Valentín", title: "Regala algo que use todos los días.", text: "Equipos Apple para regalar, con la condición y el precio de cada unidad.", cta: "Elegir un regalo", ctaUrl: ALL },
  },
  halloween: {
    key: "halloween", layout: "spotlight", tone: "dark", font: "heavy", motif: "moon",
    palette: { bg: "#111111", surface: "#1c1c1e", ink: "#f5f5f5", inkSoft: "#b0b0b5", accent: "#f2811d", onAccent: "#1a0d00", line: "#3a3a3c" },
    site: { accent: "#c2410c", accentStrong: "#9a3412", accentSoft: "#ffedd5" },
    banner: { bg: "#111111", text: "#fdba74" },
    copy: { eyebrow: "Halloween", title: "Noche de ofertas Apple.", text: "Revisa los equipos en promoción y todo el catálogo, con fotos reales de cada unidad.", cta: "Ver ofertas", ctaUrl: OFFERS },
    textNoPromos: "Equipos Apple con fotos reales de cada unidad, batería y precio con IGV.",
  },
  fiestas_patrias: {
    key: "fiestas_patrias", layout: "banded", tone: "light", font: "heavy", motif: "andean",
    palette: { bg: "#ffffff", surface: "#ffffff", ink: "#1a1a1a", inkSoft: "#4a4a4a", accent: "#c8102e", onAccent: "#ffffff", line: "#c8102e" },
    site: { accent: "#c8102e", accentStrong: "#a00d25", accentSoft: "#fde8eb" },
    banner: { bg: "#c8102e", text: "#ffffff" },
    copy: { eyebrow: "Fiestas Patrias", title: "¡Felices Fiestas Patrias!", text: "Celebra con tecnología Apple: recojo gratis en Surco y entregas en Lima.", cta: "Ver equipos", ctaUrl: ALL },
  },
  dia_madre: {
    key: "dia_madre", layout: "split", tone: "light", font: "serif", motif: "petal", mirror: true,
    palette: { bg: "#f8efe6", surface: "#ffffff", ink: "#3a2418", inkSoft: "#6b5244", accent: "#a8452f", onAccent: "#ffffff", line: "#e7b9a6" },
    site: { accent: "#a8452f", accentStrong: "#863624", accentSoft: "#f8e6df" },
    banner: { bg: "#5c2a1d", text: "#fff4ec" },
    copy: { eyebrow: "Día de la Madre", title: "Un regalo útil, y especial.", text: "iPhone, iPad, Mac y Apple Watch para ella, con fotos reales y precio con IGV.", cta: "Elegir su regalo", ctaUrl: ALL },
    prefer: ["iphone", "ipad", "watch"],
  },
  dia_padre: {
    key: "dia_padre", layout: "bento", tone: "light", font: "sans", motif: "lines",
    palette: { bg: "#efebe5", surface: "#ffffff", ink: "#1f2a33", inkSoft: "#4f5b66", accent: "#1f3a4d", onAccent: "#ffffff", line: "#b08d67" },
    site: { accent: "#1f4e6b", accentStrong: "#163a50", accentSoft: "#e3edf3" },
    banner: { bg: "#1f2a33", text: "#f3e6d4" },
    copy: { eyebrow: "Día del Padre", title: "Tecnología para acompañar cada día.", text: "Mac, iPhone y Apple Watch revisados, con su batería y precio a la vista.", cta: "Ver equipos", ctaUrl: ALL },
    prefer: ["macbook", "watch", "iphone"],
  },
  black_friday: {
    key: "black_friday", layout: "deals", tone: "dark", font: "heavy", motif: "none",
    palette: { bg: "#000000", surface: "#141414", ink: "#ffffff", inkSoft: "#b5b5b5", accent: "#ffd60a", onAccent: "#000000", line: "#2a2a2a" },
    site: { accent: "#111111", accentStrong: "#000000", accentSoft: "#f1f1f1" },
    banner: { bg: "#000000", text: "#ffd60a" },
    copy: { eyebrow: "Solo esta semana", title: "Black Friday", text: "Precios rebajados en equipos Apple del inventario, mientras haya unidades.", cta: "Ver todas las ofertas", ctaUrl: OFFERS },
    textNoPromos: "Las rebajas se publican aquí en cuanto estén activas. Mientras tanto, revisa los equipos disponibles.",
  },
  cyber_days: {
    key: "cyber_days", layout: "bento", tone: "dark", font: "mono", motif: "grid",
    palette: { bg: "#070b1f", surface: "#0e1533", ink: "#eef2ff", inkSoft: "#a9b4d6", accent: "#2a5cf0", onAccent: "#ffffff", line: "#2a3a7a" },
    site: { accent: "#2456d3", accentStrong: "#1a42a8", accentSoft: "#e5edff" },
    banner: { bg: "#0b1440", text: "#cfe0ff" },
    copy: { eyebrow: "Cyber Days", title: "Cyber Days Macsomenos.", text: "Solicita en línea, confirmamos por WhatsApp y coordinas la entrega en Lima.", cta: "Ver ofertas", ctaUrl: OFFERS },
    textNoPromos: "Solicita en línea, confirmamos por WhatsApp y coordinas la entrega en Lima.",
  },
  aniversario: {
    key: "aniversario", layout: "brand", tone: "light", font: "sans", motif: "leaf",
    palette: { bg: "#eef3ff", surface: "#ffffff", ink: "#0f1f3d", inkSoft: "#44506a", accent: "#2563eb", onAccent: "#ffffff", line: "#bcd0ff" },
    site: { accent: "#1d4ed8", accentStrong: "#1e40af", accentSoft: "#dbeafe" },
    banner: { bg: "#1d3fa8", text: "#ffffff" },
    copy: { eyebrow: "Aniversario Macsomenos", title: "Gracias por elegirnos.", text: "Celebramos con quienes confían en nosotros: más Apple, menos gasto.", cta: "Ver equipos", ctaUrl: ALL },
  },
  escolar: {
    key: "escolar", layout: "desk", tone: "light", font: "sans", motif: "notebook",
    palette: { bg: "#f6f8fb", surface: "#ffffff", ink: "#10233a", inkSoft: "#465a70", accent: "#0b6e8a", onAccent: "#ffffff", line: "#c9dbe8" },
    site: { accent: "#0b6e8a", accentStrong: "#08566c", accentSoft: "#dff1f6" },
    banner: { bg: "#0b4f63", text: "#ffffff" },
    copy: { eyebrow: "Vuelta a clases", title: "Listo para estudiar.", text: "MacBook e iPad para clases, tareas y proyectos, con fotos reales y batería a la vista.", cta: "Ver MacBook", ctaUrl: "/c/macbook" },
    prefer: ["macbook", "ipad"],
  },
  verano: {
    key: "verano", layout: "horizon", tone: "light", font: "sans", motif: "sun",
    palette: { bg: "#fff7ec", surface: "#ffffff", ink: "#1f2a37", inkSoft: "#4b5563", accent: "#b9480b", onAccent: "#ffffff", line: "#ffd29a" },
    site: { accent: "#b9480b", accentStrong: "#943908", accentSoft: "#ffeedd" },
    banner: { bg: "#7c2d12", text: "#fff7ed" },
    copy: { eyebrow: "Verano Macsomenos", title: "Más luz, más Apple.", text: "iPhone, iPad, Apple Watch y Mac para la temporada, con su precio con IGV.", cta: "Ver equipos", ctaUrl: ALL },
    prefer: ["iphone", "watch", "ipad"],
  },
  custom: {
    key: "custom", layout: "split", tone: "light", font: "sans", motif: "none",
    palette: { bg: "#f5f5f7", surface: "#ffffff", ink: "#1d1d1f", inkSoft: "#515154", accent: "#2563eb", onAccent: "#ffffff", line: "#d2d2d7" },
    site: { accent: "#1d4ed8", accentStrong: "#1e40af", accentSoft: "#e3ecff" },
    banner: { bg: "#111827", text: "#ffffff" },
    copy: { eyebrow: "Macsomenos", title: "Más Apple, menos gasto.", text: "Equipos Apple con fotos reales, batería y precio de cada unidad.", cta: "Ver equipos", ctaUrl: ALL },
  },
};

// ---------- Contraste (WCAG 2.x) ----------
const HEX = /^#[0-9a-f]{6}$/i;
export const isHex = (value: unknown): value is string => typeof value === "string" && HEX.test(value);

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** Blanco o casi negro, lo que más contraste dé sobre `bg`. */
export const readableOn = (bg: string) => (contrast(bg, "#ffffff") >= contrast(bg, "#111111") ? "#ffffff" : "#111111");

function mix(a: string, b: string, t: number) {
  const ch = (h: string, i: number) => parseInt(h.slice(i, i + 2), 16);
  return `#${[1, 3, 5].map((i) => Math.round(ch(a, i) * (1 - t) + ch(b, i) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Oscurece o aclara `color` hasta llegar a `ratio` sobre `bg` (para colores elegidos en el panel). */
export function ensureContrast(color: string, bg: string, ratio = 4.5) {
  if (contrast(color, bg) >= ratio) return color;
  const target = readableOn(bg) === "#ffffff" ? "#ffffff" : "#000000";
  for (let t = 0.1; t <= 1; t += 0.1) {
    const candidate = mix(color, target, t);
    if (contrast(candidate, bg) >= ratio) return candidate;
  }
  return target === "#ffffff" ? "#ffffff" : "#111111";
}

/** Nombre corto de cada campaña (títulos de Ofertas y etiquetas). */
export const CAMPAIGN_LABELS: Record<string, string> = {
  navidad: "Navidad", ano_nuevo: "Año Nuevo", san_valentin: "San Valentín", halloween: "Halloween",
  fiestas_patrias: "Fiestas Patrias", dia_madre: "Día de la Madre", dia_padre: "Día del Padre",
  black_friday: "Black Friday", cyber_days: "Cyber Days", aniversario: "Aniversario", escolar: "Vuelta a clases",
  verano: "Verano", custom: "",
};

export type ResolvedCampaign = Campaign & {
  /** Nombre corto (vacío en la campaña personalizada sin texto propio). */
  label: string;
  /** Acento y detalle con contraste AA sobre la tarjeta, para cuando se usan como texto (precios). */
  text: { accent: string; line: string };
  /** El subtítulo viene del panel: se respeta tal cual. */
  customSubtitle: boolean;
  image: { src: string; mobileSrc: string; position: string } | null;
};

type ThemeLike = {
  preset: string;
  colors?: Record<string, string>;
  banner?: { title?: string; text?: string; imageUrl?: string; design?: Partial<ThemeDesign> };
};

const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(value)) ? (value as T) : fallback;

/**
 * Campaña final: diseño de su festividad + ajustes del panel. Los colores
 * guardados solo se usan con «colores propios» (o en la campaña personalizada)
 * y siempre se corrigen para mantener contraste AA.
 */
export function resolveCampaign(theme: ThemeLike | null): ResolvedCampaign | null {
  if (!theme) return null;
  const base = CAMPAIGNS[theme.preset] || CAMPAIGNS.custom;
  const d = theme.banner?.design || {};
  const isCustom = base.key === "custom";
  const tone = pick(d.tone, TONES, base.tone);
  const toneChanged = tone !== base.tone;
  let palette = { ...base.palette };
  let site = { ...base.site };
  let banner = { ...base.banner };

  // Cambiar el tono de una campaña predefinida usa una base neutra de ese tono.
  if (toneChanged) {
    palette = tone === "dark"
      ? { ...palette, bg: "#111214", surface: "#1c1d21", ink: "#f5f5f7", inkSoft: "#b4b4bb", line: "#34353b" }
      : { ...palette, bg: "#f5f5f7", surface: "#ffffff", ink: "#1d1d1f", inkSoft: "#515154", line: "#d2d2d7" };
  }

  const colors = theme.colors || {};
  if (d.customColors || isCustom) {
    if (isHex(colors.accent)) {
      const accent = ensureContrast(colors.accent, "#ffffff");
      site = {
        accent,
        accentStrong: isHex(colors.accentStrong) ? ensureContrast(colors.accentStrong, "#ffffff") : mix(accent, "#000000", 0.2),
        accentSoft: isHex(colors.accentSoft) ? colors.accentSoft : mix(accent, "#ffffff", 0.88),
      };
      palette.accent = colors.accent;
      palette.onAccent = readableOn(colors.accent);
    }
    if (isHex(d.surface)) {
      palette.bg = d.surface;
      palette.surface = tone === "dark" ? mix(d.surface, "#ffffff", 0.08) : mix(d.surface, "#ffffff", 0.7);
    }
    const inkBase = isHex(d.ink) ? d.ink : palette.ink;
    palette.ink = ensureContrast(inkBase, palette.bg, 7);
    palette.inkSoft = ensureContrast(palette.inkSoft, palette.bg, 4.5);
    if (isHex(colors.bannerBg)) banner = { bg: colors.bannerBg, text: ensureContrast(isHex(colors.bannerText) ? colors.bannerText : "#ffffff", colors.bannerBg) };
  }

  const imageUrl = String(d.imageUrl || theme.banner?.imageUrl || "").trim();
  const x = Number.isFinite(Number(d.imageX)) ? Number(d.imageX) : 50;
  const y = Number.isFinite(Number(d.imageY)) ? Number(d.imageY) : 50;
  const layout = pick(d.layout, LAYOUTS, isCustom && imageUrl ? "immersive" : base.layout);

  return {
    ...base,
    layout,
    tone,
    font: pick(d.font, FONTS, base.font),
    motif: pick(d.motif, MOTIFS, base.motif),
    palette,
    site,
    banner,
    text: { accent: ensureContrast(palette.accent, palette.surface), line: ensureContrast(palette.line, palette.surface) },
    label: CAMPAIGN_LABELS[base.key] || String(d.eyebrow || "").trim(),
    customSubtitle: Boolean(d.subtitle || (isCustom && theme.banner?.text)),
    copy: {
      eyebrow: d.eyebrow || base.copy.eyebrow,
      title: d.headline || (isCustom && theme.banner?.title) || base.copy.title,
      text: d.subtitle || (isCustom && theme.banner?.text) || base.copy.text,
      cta: d.ctaLabel || base.copy.cta,
      ctaUrl: d.ctaUrl || base.copy.ctaUrl,
    },
    image: imageUrl ? { src: imageUrl, mobileSrc: String(d.mobileImageUrl || "").trim() || imageUrl, position: `${x}% ${y}%` } : null,
  };
}
