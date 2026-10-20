"use client";

import { useCampaign } from "../components/theme/SiteThemeProvider";
import { vars, HEADLINE } from "../components/campaign/parts";
import { AndeanBand, GridGlow, MotifGlyph, Pinstripe } from "../components/campaign/motifs";

/** Encabezado de ofertas: con temática, la paleta, la letra y el motivo de la campaña. */
export default function OffersHeader({ count }: { count: number }) {
  const c = useCampaign();
  const text = count
    ? `${count} ${count === 1 ? "equipo con precio especial disponible" : "equipos con precio especial disponibles"} ahora mismo.`
    : "Ahora mismo no hay equipos en promoción. Vuelve pronto o revisa todo el catálogo.";

  if (!c) {
    return (
      <div className="relative overflow-hidden rounded-[26px] px-6 py-8 sm:px-8 sm:py-10" style={{ background: "linear-gradient(135deg,#fff1f2,#ffffff)" }}>
        <h1 className="text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)] sm:text-5xl">Ofertas</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[color:var(--foreground-soft)]">{text}</p>
      </div>
    );
  }

  const bigGlyph = ["ribbon", "heart", "moon", "petal", "leaf", "sun", "gold"].includes(c.motif);
  return (
    <div style={vars(c)} className="relative overflow-hidden rounded-[26px] px-6 py-9 sm:px-10 sm:py-12">
      {c.motif === "grid" && <GridGlow color="var(--c-accent)" className="absolute inset-0 h-full w-full" />}
      {c.motif === "andean" && <AndeanBand color="var(--c-accent)" className="absolute inset-x-0 bottom-0 h-6 w-full" />}
      {c.motif === "lines" && <Pinstripe color="var(--c-line)" className="absolute -right-6 -top-6 h-48 w-48 opacity-50" />}
      {c.motif === "notebook" && <div aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,transparent_0_31px,var(--c-line)_31px_32px)]" />}
      {bigGlyph && <MotifGlyph motif={c.motif} color="var(--c-line)" className="pointer-events-none absolute -right-6 -top-6 hidden h-56 w-56 opacity-25 sm:block" />}
      <div className="relative">
        <h1 className={`${HEADLINE[c.font]} text-[clamp(38px,6vw,72px)]`}>Ofertas</h1>
        {c.key === "black_friday" && <span aria-hidden="true" className="mt-3 block h-2 w-32 bg-[color:var(--c-accent)]" />}
        <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--c-soft)] sm:text-lg">{text}</p>
      </div>
    </div>
  );
}
