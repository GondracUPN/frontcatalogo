export const PERU_TIME_ZONE = "America/Lima";

function toDate(value: unknown) {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function formatPeruDate(value: unknown) {
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: PERU_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatPeruDateTime(value: unknown) {
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: PERU_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function dateInputInPeru(value: unknown = new Date()) {
  const date = toDate(value) || new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PERU_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export function hasMeaningfulPeruUpdate(createdAt: unknown, updatedAt: unknown) {
  const created = toDate(createdAt);
  const updated = toDate(updatedAt);
  if (!created || !updated) return false;
  return updated.getTime() - created.getTime() > 60_000;
}
