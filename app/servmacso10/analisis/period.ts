// Periodos en hora de Lima (UTC-5, sin horario de verano).
const OFFSET = 5 * 3600e3;

export type Group = "hour" | "day" | "week" | "month" | "year";
export type Period = { key: string; label: string; from: Date; to: Date; group: Group };

/** Medianoche de Lima del día que contiene `date`, desplazada `days` días. */
function limaMidnight(date: Date, days = 0) {
  const lima = new Date(date.getTime() - OFFSET);
  return new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate() + days) + OFFSET);
}
function limaMonthStart(date: Date, months = 0) {
  const lima = new Date(date.getTime() - OFFSET);
  return new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth() + months, 1) + OFFSET);
}
function limaYearStart(date: Date) {
  const lima = new Date(date.getTime() - OFFSET);
  return new Date(Date.UTC(lima.getUTCFullYear(), 0, 1) + OFFSET);
}

export const PRESETS = [
  { key: "24h", label: "Últimas 24 h" },
  { key: "today", label: "Hoy" },
  { key: "yesterday", label: "Ayer" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "month", label: "Mes actual" },
  { key: "prev_month", label: "Mes anterior" },
  { key: "year", label: "Año actual" },
  { key: "custom", label: "Personalizado" },
] as const;

export function presetPeriod(key: string, now = new Date(), custom?: { from: string; to: string }): Period {
  const label = PRESETS.find((p) => p.key === key)?.label || key;
  switch (key) {
    case "24h":
      return { key, label, from: new Date(now.getTime() - 864e5), to: now, group: "hour" };
    case "today":
      return { key, label, from: limaMidnight(now), to: now, group: "hour" };
    case "yesterday":
      return { key, label, from: limaMidnight(now, -1), to: limaMidnight(now), group: "hour" };
    case "7d":
      return { key, label, from: limaMidnight(now, -6), to: now, group: "day" };
    case "90d":
      return { key, label, from: limaMidnight(now, -89), to: now, group: "week" };
    case "month":
      return { key, label, from: limaMonthStart(now), to: now, group: "day" };
    case "prev_month":
      return { key, label, from: limaMonthStart(now, -1), to: limaMonthStart(now), group: "day" };
    case "year":
      return { key, label, from: limaYearStart(now), to: now, group: "month" };
    case "custom": {
      // Fechas «AAAA-MM-DD» en hora de Lima; el fin incluye todo ese día.
      const from = custom?.from ? new Date(`${custom.from}T00:00:00-05:00`) : limaMidnight(now, -29);
      const toDay = custom?.to ? new Date(`${custom.to}T00:00:00-05:00`) : limaMidnight(now);
      const to = new Date(Math.min(toDay.getTime() + 864e5, now.getTime()));
      const days = (to.getTime() - from.getTime()) / 864e5;
      return { key, label, from, to, group: days <= 2 ? "hour" : days <= 120 ? "day" : days <= 730 ? "week" : "month" };
    }
    case "30d":
    default:
      return { key: "30d", label: "30 días", from: limaMidnight(now, -29), to: now, group: "day" };
  }
}

const LIMITS: Record<Group, number> = { hour: 31, day: 800, week: 2100, month: 3600, year: 7300 };
/** Agrupaciones posibles para la duración del periodo (el backend aplica los mismos límites). */
export function allowedGroups(period: Pick<Period, "from" | "to">): Group[] {
  const days = (period.to.getTime() - period.from.getTime()) / 864e5;
  return (["hour", "day", "week", "month", "year"] as Group[]).filter((group) => days <= LIMITS[group] && (group !== "year" || days > 300) && (group !== "month" || days > 40) && (group !== "week" || days > 13));
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** Etiqueta de un punto del gráfico («2026-10-13T14:00» en hora de Lima). */
export function bucketLabel(bucket: string, group: Group, multiDay: boolean) {
  const [date, time = "00:00"] = bucket.split("T");
  const [y, m, d] = date.split("-").map(Number);
  if (group === "hour") return multiDay ? `${d}/${m} ${time.slice(0, 2)}h` : `${time.slice(0, 2)}:00`;
  if (group === "day") return `${d} ${MONTHS[m - 1]}`;
  if (group === "week") return `sem. ${d} ${MONTHS[m - 1]}`;
  if (group === "month") return `${MONTHS[m - 1]} ${y}`;
  return String(y);
}

export function limaDateInput(date: Date) {
  return new Date(date.getTime() - OFFSET).toISOString().slice(0, 10);
}
