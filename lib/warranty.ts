export type WarrantyStatus = "active" | "expired" | "unknown";

function peruToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function warrantyDateKey(value: unknown) {
  const raw = String(value ?? "").trim();
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const latin = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
  if (latin) return `${latin[3]}-${latin[2].padStart(2, "0")}-${latin[1].padStart(2, "0")}`;
  const normalized = raw.toLowerCase().normalize("NFD").replace(/\p{Diacritic}+/gu, "");
  const spanish = normalized.match(/^(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/);
  if (spanish) {
    const months: Record<string, string> = {
      enero: "01", febrero: "02", marzo: "03", abril: "04", mayo: "05", junio: "06",
      julio: "07", agosto: "08", septiembre: "09", setiembre: "09", octubre: "10", noviembre: "11", diciembre: "12",
    };
    const month = months[spanish[2]];
    if (month) return `${spanish[3]}-${month}-${spanish[1].padStart(2, "0")}`;
  }
  return "";
}

export function warrantyStatus(value: unknown): WarrantyStatus {
  const date = warrantyDateKey(value);
  if (!date) return "unknown";
  return date <= peruToday() ? "expired" : "active";
}

export function formatWarrantyDate(value: unknown) {
  const key = warrantyDateKey(value);
  if (!key) return String(value ?? "").trim();
  const [year, month, day] = key.split("-").map(Number);
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return months[month - 1] ? `${day} de ${months[month - 1]} de ${year}` : String(value ?? "").trim();
}
