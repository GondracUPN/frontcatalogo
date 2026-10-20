import { formatLimaDateTime } from "@/lib/lima-date";

export const STATUS_LABELS: Record<string, string> = {
  nueva: "Nueva",
  pendiente_confirmacion: "Pendiente de confirmación",
  confirmada: "Confirmada",
  reservada: "Reservada",
  pagada: "Pagada",
  en_preparacion: "En preparación",
  enviada: "Enviada",
  entregada: "Entregada",
  cancelada: "Cancelada",
};

export const STATUS_TONES: Record<string, string> = {
  nueva: "bg-blue-100 text-blue-800",
  pendiente_confirmacion: "bg-amber-100 text-amber-800",
  confirmada: "bg-indigo-100 text-indigo-800",
  reservada: "bg-purple-100 text-purple-800",
  pagada: "bg-emerald-100 text-emerald-800",
  en_preparacion: "bg-cyan-100 text-cyan-800",
  enviada: "bg-sky-100 text-sky-800",
  entregada: "bg-green-100 text-green-800",
  cancelada: "bg-gray-200 text-gray-700",
};

export const PAYMENT_METHODS: Array<{ value: string; label: string }> = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "yape", label: "Yape" },
  { value: "plin", label: "Plin" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "otro", label: "Otro" },
];

export function formatMoney(value: unknown) {
  const number = Number(value || 0);
  const [int, dec] = Math.abs(number).toFixed(2).split(".");
  return `${number < 0 ? "-" : ""}S/ ${int.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${dec}`;
}

export function formatDate(value: unknown) {
  return formatLimaDateTime(value);
}

/** Mensaje prellenado para WhatsApp con el número de solicitud. */
export function whatsappLink(phone: string, name: string, number: string) {
  const digits = String(phone || "").replace(/\D+/g, "");
  const full = digits.length === 9 ? `51${digits}` : digits;
  const text = `Hola ${String(name || "").split(" ")[0]}, te escribimos de Macsomenos por tu solicitud ${number}.`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}
