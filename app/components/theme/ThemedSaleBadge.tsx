"use client";

import { useCampaign } from "./SiteThemeProvider";
import { MotifGlyph } from "../campaign/motifs";

/**
 * Etiqueta de descuento. Sin temática: rojo habitual. Con temática toma los
 * colores del aviso de la campaña (contraste AA comprobado) y su motivo.
 */
export default function ThemedSaleBadge({ label, size = "md", className = "" }: { label: string; size?: "sm" | "md"; className?: string }) {
  const campaign = useCampaign();
  const sizing = size === "sm" ? "gap-1 px-2.5 py-1 text-[10px]" : "gap-1.5 px-4 py-2 text-xs";
  if (!campaign) {
    return (
      <span className={`inline-flex items-center rounded-full bg-rose-600 font-semibold uppercase tracking-[0.14em] text-white shadow-[0_10px_26px_rgba(225,29,72,0.28)] ${sizing} ${className}`}>
        {label}
      </span>
    );
  }
  const offer = campaign.key === "black_friday" || campaign.key === "cyber_days";
  const bg = offer ? campaign.palette.accent : campaign.banner.bg;
  const fg = offer ? campaign.palette.onAccent : campaign.banner.text;
  return (
    <span className={`inline-flex items-center rounded-full font-semibold uppercase tracking-[0.14em] ${sizing} ${className}`} style={{ background: bg, color: fg }}>
      <MotifGlyph motif={campaign.motif} className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {label}
    </span>
  );
}

/** Recuadro de promoción en la ficha, con la estética de la temática si la hay. */
export function ThemedPromoBox({ title, text }: { title: string; text: string }) {
  const campaign = useCampaign();
  if (!campaign) {
    return (
      <div className="mt-4 rounded-[18px] border border-rose-200 bg-[linear-gradient(135deg,#fff1f2,#ffe4e6)] px-4 py-3 text-rose-950 shadow-[0_14px_34px_rgba(225,29,72,0.12)]">
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-rose-700">{title}</div>
        <div className="mt-1 text-sm font-semibold">{text}</div>
      </div>
    );
  }
  return (
    <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-[color:var(--accent)]/30 bg-[color:var(--accent-soft)] px-4 py-3 text-[color:var(--foreground)]">
      <MotifGlyph motif={campaign.motif} color="var(--accent)" className="mt-0.5 h-6 w-6 shrink-0" />
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.22em] text-[color:var(--accent)]">{campaign.label ? `${campaign.label} · ${title}` : title}</div>
        <div className="mt-1 text-sm font-semibold">{text}</div>
      </div>
    </div>
  );
}
