/** Enlace de WhatsApp solo para números (los usuarios @usuario no tienen enlace directo). */
export function appointmentWhatsappLink(contact: string, customerName: string | null, product: string) {
  const digits = String(contact || "");
  if (!/^\d{7,15}$/.test(digits)) return null;
  const full = digits.length === 9 ? `51${digits}` : digits;
  const first = String(customerName || "").trim().split(" ")[0];
  const text = `Hola${first ? ` ${first}` : ""}, te escribimos de Macsomenos para confirmar tu cita por ${product}.`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Fecha/hora de Lima (UTC-5) como partes. */
export function limaParts(value: string | Date) {
  const d = new Date(new Date(value).getTime() - 5 * 3600 * 1000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), key: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` };
}

/** Valor para <input type="datetime-local"> en hora de Lima. */
export function toLimaInput(value: string | Date) {
  const p = limaParts(value);
  return `${p.key}T${pad(p.h)}:${pad(p.min)}`;
}

export function limaTime(value: string | Date) {
  const p = limaParts(value);
  return `${pad(p.h)}:${pad(p.min)}`;
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

const dayNumber = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};

export function dayLabel(key: string, todayKey: string) {
  const diff = dayNumber(key) - dayNumber(todayKey);
  const [, m, d] = key.split("-").map(Number);
  const base = `${WEEKDAYS[new Date(dayNumber(key) * 86400000).getUTCDay()]} ${pad(d)}/${pad(m)}`;
  if (diff === 0) return `Hoy · ${base}`;
  if (diff === 1) return `Mañana · ${base}`;
  if (diff < 0) return `Pasada · ${base}`;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
