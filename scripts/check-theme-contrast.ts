// Comprueba el contraste WCAG AA de las 13 campañas y de la corrección automática
// de colores propios. Uso: node scripts/check-theme-contrast.ts
import { CAMPAIGNS, contrast, resolveCampaign } from "../lib/campaigns.ts";

const failures: string[] = [];
const check = (label: string, a: string, b: string, min: number) => {
  const ratio = contrast(a, b);
  if (ratio < min) failures.push(`${label}: ${ratio.toFixed(2)} < ${min} (${a} / ${b})`);
};

for (const c of Object.values(CAMPAIGNS)) {
  const p = c.palette;
  check(`${c.key} texto/fondo`, p.ink, p.bg, 7);
  check(`${c.key} texto/tarjeta`, p.ink, p.surface, 4.5);
  check(`${c.key} texto secundario/fondo`, p.inkSoft, p.bg, 4.5);
  check(`${c.key} botón principal`, p.onAccent, p.accent, 4.5);
  check(`${c.key} acento del sitio sobre blanco`, c.site.accent, "#ffffff", 4.5);
  check(`${c.key} acento hover sobre blanco`, c.site.accentStrong, "#ffffff", 4.5);
  check(`${c.key} texto sobre suave`, c.site.accent, c.site.accentSoft, 4.5);
  check(`${c.key} aviso superior`, c.banner.text, c.banner.bg, 4.5);
}

// Lo que realmente se pinta, en cada campaña × tono × colores propios mal elegidos.
const BAD = { accent: "#ffee00", accentStrong: "#fff3a0", accentSoft: "#fffde0", bannerBg: "#ffffff", bannerText: "#eeeeee" };
let combos = 0;
for (const key of Object.keys(CAMPAIGNS)) {
  for (const tone of ["", "light", "dark"]) {
    for (const custom of [false, true]) {
      const r = resolveCampaign({ preset: key, colors: custom ? BAD : {}, banner: { design: { tone, customColors: custom, surface: custom ? "#fafafa" : "", ink: custom ? "#dddddd" : "" } } })!;
      const tag = `${key}/${tone || "base"}/${custom ? "propios" : "campaña"}`;
      const p = r.palette;
      check(`${tag} texto/fondo`, p.ink, p.bg, 4.5);
      check(`${tag} secundario/fondo`, p.inkSoft, p.bg, 4.5);
      check(`${tag} texto/tarjeta`, p.ink, p.surface, 4.5);
      check(`${tag} secundario/tarjeta`, p.inkSoft, p.surface, 4.5);
      check(`${tag} botón`, p.onAccent, p.accent, 4.5);
      check(`${tag} precio acento/tarjeta`, r.text.accent, p.surface, 4.5);
      check(`${tag} precio detalle/tarjeta`, r.text.line, p.surface, 4.5);
      check(`${tag} acento del sitio`, r.site.accent, "#ffffff", 4.5);
      check(`${tag} aviso`, r.banner.text, r.banner.bg, 4.5);
      combos++;
    }
  }
}

// Colores propios mal elegidos en el panel: se corrigen hasta AA.
const bad = resolveCampaign({ preset: "custom", colors: { accent: "#ffee00", bannerBg: "#ffffff", bannerText: "#eeeeee" }, banner: { design: { customColors: true, surface: "#fafafa", ink: "#dddddd" } } })!;
check("custom acento corregido", bad.site.accent, "#ffffff", 4.5);
check("custom botón corregido", bad.palette.onAccent, bad.palette.accent, 4.5);
check("custom texto corregido", bad.palette.ink, bad.palette.bg, 7);
check("custom aviso corregido", bad.banner.text, bad.banner.bg, 4.5);
const dark = resolveCampaign({ preset: "escolar", banner: { design: { tone: "dark" } } })!;
check("escolar en tono oscuro", dark.palette.ink, dark.palette.bg, 7);
check("escolar en tono oscuro (secundario)", dark.palette.inkSoft, dark.palette.bg, 4.5);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`Contraste AA correcto en ${Object.keys(CAMPAIGNS).length} campañas y ${combos} combinaciones de tono y colores propios.`);
