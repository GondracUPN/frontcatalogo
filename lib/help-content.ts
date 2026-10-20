// Condiciones de compra de Macsomenos y preguntas frecuentes.
//
// Fuente única: la ficha de producto (PurchaseInformation), la portada y la
// página /preguntas-frecuentes leen de aquí, así una condición no puede decir
// cosas distintas en cada sitio. Son las condiciones ya publicadas por la
// tienda; no añadir reglas nuevas sin confirmación comercial.
import { CONDITION_INFO } from "./catalog-display";

export const WAREHOUSE_ADDRESS = "Jr. Ganimedes 245, Surco";

export const PURCHASE_STEPS = [
  "Selecciona el equipo.",
  "Envía una solicitud sin pago.",
  "Macsomenos confirma la disponibilidad por WhatsApp.",
  "Se coordinan el pago y la entrega o recojo.",
] as const;

export const MACSOMENOS_WARRANTY =
  "Durante 6 meses cubre únicamente que el equipo no sea bloqueado por una cuenta de iCloud ajena.";

export function warrantyExclusion(category = "") {
  return `No cubre bloqueos ocasionados por la cuenta o las credenciales del propio comprador, como olvidar su contraseña${category === "macbook" ? ", ni problemas relacionados con FileVault" : ""}.`;
}

export const MACBOOK_INSPECTION = [
  "Limpiamos el equipo con alcohol isopropílico y retiramos stickers, suciedad y polvo del teclado, la pantalla y la carcasa externa.",
  "Para comprobar el estado interno utilizamos la herramienta de diagnóstico de Apple.",
] as const;

export const PAYMENT_METHODS = [
  "Aceptamos transferencias a BCP, Interbank y BBVA.",
  "También aceptamos tarjeta de crédito con una comisión de 3.5%. La comisión se coordina antes del pago y no está incluida automáticamente en los precios mostrados.",
] as const;

export const WAREHOUSE_MAP_URL = "https://maps.app.goo.gl/ttGMLJEKx4LEwNet6";

export const DELIVERY_RULES: { label?: string; text: string }[] = [
  { label: "Recojo en almacén:", text: `siempre gratis, en nuestro almacén de ${WAREHOUSE_ADDRESS}.` },
  { label: "Entrega en centros comerciales:", text: "puedes recibir tu equipo en centros comerciales de Lima como Mall del Sur, Jockey Plaza y otros. Es contraentrega: no pagas ningún adelanto y pagas el equipo al recibirlo. El costo de la entrega se coordina por WhatsApp según tu distrito y se confirma contigo antes del pago: según el equipo y la compra, puede ser gratis o tener un costo." },
  { label: "Envío por Shalom:", text: "se realiza previo pago total del equipo. Coordinamos la agencia de destino y el costo del envío por WhatsApp según tu ciudad y distrito." },
];

export const RETURNS_POLICY =
  "No se aceptan devoluciones después de que el comprador prueba completamente el equipo y confirma su conformidad. Cualquier observación debe comunicarse durante esa revisión.";

export type FaqTopic = { id: string; label: string };

export const FAQ_TOPICS: FaqTopic[] = [
  { id: "compra", label: "Compra y solicitudes" },
  { id: "estado", label: "Estado de los equipos" },
  { id: "bateria", label: "Batería y ciclos" },
  { id: "garantia", label: "Garantías" },
  { id: "precios", label: "Precios, IGV y comprobantes" },
  { id: "pagos", label: "Métodos de pago" },
  { id: "entrega", label: "Envíos y entregas" },
  { id: "disponibilidad", label: "Disponibilidad y próximos ingresos" },
];

export type FaqItem = {
  id: string;
  topic: string;
  question: string;
  /** Párrafos de la respuesta. */
  answer: string[];
  link?: { href: string; label: string };
};

const conditionAnswer = CONDITION_INFO.map((info) => `${info.label}: ${info.description}`);

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "como-comprar",
    topic: "compra",
    question: "¿Cómo solicito un equipo?",
    answer: [
      "Abre su ficha, agrégalo al carrito y envía la solicitud con tu nombre y teléfono. Te escribimos por WhatsApp para confirmar los siguientes pasos.",
      ...PURCHASE_STEPS.map((step, index) => `${index + 1}. ${step}`),
    ],
  },
  {
    id: "solicitud-sin-pago",
    topic: "compra",
    question: "¿Enviar la solicitud significa que ya pagué?",
    answer: [
      "No. Agregar al carrito y enviar la solicitud no realiza ningún pago. Primero confirmamos contigo por WhatsApp que el equipo siga disponible y después se coordinan el pago y la entrega o el recojo.",
    ],
  },
  {
    id: "mas-fotos",
    topic: "compra",
    question: "¿Puedo pedir más fotos o hacer una consulta sobre un equipo?",
    answer: [
      "Sí. Desde la ficha usa «Preguntar por WhatsApp»: el mensaje incluye el equipo y su código para que te respondamos sobre esa unidad.",
    ],
    link: { href: "/contact", label: "Ver contacto" },
  },
  {
    id: "estados",
    topic: "estado",
    question: "¿Qué diferencia hay entre nuevo, open box y usado?",
    answer: conditionAnswer,
  },
  {
    id: "fotos-reales",
    topic: "estado",
    question: "¿Dónde veo el estado real del equipo?",
    answer: [
      "En la ficha: la condición, la batería, los accesorios que incluye y las fotografías de los detalles estéticos registrados. Puedes ampliar cada foto para revisarla de cerca.",
      "En equipos en camino (preventa) las fotos son referenciales hasta que llegue la unidad.",
    ],
  },
  {
    id: "accesorios",
    topic: "estado",
    question: "¿Cómo sé qué accesorios incluye?",
    answer: ["Cada ficha indica lo que incluye esa unidad, por ejemplo caja, cargador (cubo) o cable. Dos equipos del mismo modelo pueden incluir accesorios distintos."],
  },
  {
    id: "inspeccion",
    topic: "estado",
    question: "¿Cómo revisan las MacBook?",
    answer: [...MACBOOK_INSPECTION],
  },
  {
    id: "bateria",
    topic: "bateria",
    question: "¿Dónde veo la salud de la batería y los ciclos?",
    answer: [
      "En los equipos usados y open box la ficha muestra la salud de la batería y, cuando está registrado, el número de ciclos. Si un dato no aparece, pregúntanos antes de solicitar el equipo.",
    ],
  },
  {
    id: "garantia-macsomenos",
    topic: "garantia",
    question: "¿Qué cubre la garantía de Macsomenos?",
    answer: [MACSOMENOS_WARRANTY, warrantyExclusion(), "En MacBook tampoco cubre problemas relacionados con FileVault."],
  },
  {
    id: "garantia-apple",
    topic: "garantia",
    question: "¿El equipo tiene garantía de Apple?",
    answer: ["Depende de cada unidad. Cuando un equipo conserva la garantía limitada de Apple, su ficha lo indica con la fecha de vencimiento."],
  },
  {
    id: "devoluciones",
    topic: "garantia",
    question: "¿Puedo devolver un equipo?",
    answer: [RETURNS_POLICY],
  },
  {
    id: "igv",
    topic: "precios",
    question: "¿El precio incluye IGV?",
    answer: [
      "Cada equipo muestra su precio sin IGV y, más grande, el total con IGV (18%), que es el precio del equipo. La entrega a un punto con costo y la comisión por pago con tarjeta se confirman contigo antes del pago.",
    ],
  },
  {
    id: "descuentos",
    topic: "precios",
    question: "¿Cuándo aparece un precio rebajado?",
    answer: ["Solo cuando el equipo tiene una promoción activa: verás el precio anterior tachado y el ahorro. Encuentra todos en Ofertas."],
    link: { href: "/ofertas", label: "Ver ofertas" },
  },
  {
    id: "comprobante",
    topic: "precios",
    question: "¿Entregan boleta o factura?",
    answer: ["Indícanos por WhatsApp el comprobante que necesitas antes de pagar y te confirmamos cómo se emitirá para tu compra."],
  },
  {
    id: "pagos",
    topic: "pagos",
    question: "¿Qué métodos de pago aceptan?",
    answer: [...PAYMENT_METHODS],
  },
  {
    id: "pago-web",
    topic: "pagos",
    question: "¿Puedo pagar en la web?",
    answer: ["No. La web solo recibe tu solicitud. El pago se coordina por WhatsApp después de confirmar la disponibilidad."],
  },
  {
    id: "recojo",
    topic: "entrega",
    question: "¿Dónde recojo mi equipo?",
    answer: [`En nuestro almacén de ${WAREHOUSE_ADDRESS}. El recojo siempre es gratis; coordina el horario por WhatsApp.`],
    link: { href: WAREHOUSE_MAP_URL, label: "Ver ubicación en Google Maps" },
  },
  {
    id: "entregas",
    topic: "entrega",
    question: "¿Hacen entregas en centros comerciales de Lima?",
    answer: DELIVERY_RULES.map((rule) => (rule.label ? `${rule.label} ${rule.text}` : rule.text)),
  },
  {
    id: "disponible",
    topic: "disponibilidad",
    question: "¿Cómo sé si un equipo sigue disponible?",
    answer: ["Cada ficha muestra si está disponible, en camino o vendido. Antes de coordinar el pago confirmamos que siga libre."],
  },
  {
    id: "en-camino",
    topic: "disponibilidad",
    question: "¿Qué pasa con un equipo en camino?",
    answer: [
      "Son equipos en preventa que se pueden separar antes de su llegada. La fecha de llegada es estimada; si la fecha publicada ya pasó, pídenos una actualización antes de solicitarlo.",
      "Consulta las condiciones de separación y reserva antes de enviar la solicitud.",
    ],
    link: { href: "/proximos", label: "Ver próximos ingresos" },
  },
];

/** Preguntas que se muestran en la portada, en este orden. */
export const HOME_FAQ_IDS = ["como-comprar", "fotos-reales", "igv", "garantia-macsomenos", "entregas"] as const;
