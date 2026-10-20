// Fecha y hora de Lima (UTC-5, sin horario de verano) con formato fijo.
// No usa toLocaleString: el servidor (Node) y el navegador pueden formatear
// distinto ("a. m." / "a.m.") y provocar errores de hidratación.
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

export function formatLimaDateTime(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "—";
  const lima = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${lima.getUTCDate()} ${MONTHS[lima.getUTCMonth()]} ${lima.getUTCFullYear()}, ${pad(lima.getUTCHours())}:${pad(lima.getUTCMinutes())}`;
}
