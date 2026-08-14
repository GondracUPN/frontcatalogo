"use client";
import React from "react";
import { createManualPreventaDraft, deleteStaged, updateStaged, publishStaged, replacePreventaWithInventory } from "../../actions";
import {
  DEFAULT_PRODUCT_VERSION_CONFIG,
  getIphoneStorageOptionsFromConfig,
  normalizeProductVersionConfig,
  type ProductVersionConfig,
} from "@/lib/product-version-config";

type SaleType = "PREVENTA" | "VENTA_SIMPLE" | "PROMOCION" | "OFERTA";
type DiscountMode = "percent" | "amount";
type MergeCandidate = { id: string; sku: string; title: string };
type ReplacementCandidate = { id: string; sku: string; title: string; price?: string | number; status?: string };

type AccessoryName = "Caja" | "Cubo" | "Cable";

function includesAccessory(value: string, accessory: AccessoryName) {
  return new RegExp(`\\b${accessory}\\b`, "i").test(String(value || ""));
}

function includesFromFlags(caja: boolean, cubo: boolean, cable: boolean) {
  const selected = [caja ? "Caja" : "", cubo ? "Cubo" : "", cable ? "Cable" : ""].filter(Boolean);
  if (!selected.length) return "Ninguno";
  if (selected.length === 1) {
    if (caja) return "Caja sola";
    if (cubo) return "Cubo solo";
    return "Cable solo";
  }
  return selected.join(" + ");
}

function parseStoredBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "si", "sí", "yes", "on", "fake", "generico", "genérico"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return null;
}

function deriveIncludesValue(item: any, notes: any) {
  const incluye = notes?.incluye;
  const raw = [item?.includes, notes?.includes, typeof incluye === "string" ? incluye : "", notes?.accesoriosTexto]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
  if (/\botros?\b/i.test(raw)) return "Otros";
  if (/\bningun|\bno incluye/i.test(raw)) return "Ninguno";
  const flagObject = incluye && typeof incluye === "object" ? incluye : {};
  const cajaFlag = parseStoredBoolean(flagObject?.caja ?? notes?.accessories?.caja ?? notes?.accesorios?.caja);
  const cuboFlag = parseStoredBoolean(flagObject?.cubo ?? notes?.accessories?.cubo ?? notes?.accesorios?.cubo);
  const cableFlag = parseStoredBoolean(flagObject?.cable ?? notes?.accessories?.cable ?? notes?.accesorios?.cable);
  const caja = cajaFlag ?? /\bcaja\b/i.test(raw);
  const cubo = cuboFlag ?? /\bcubo\b|\bcargador\b/i.test(raw);
  const cable = cableFlag ?? /\bcable\b/i.test(raw);
  if (caja || cubo || cable) return includesFromFlags(caja, cubo, cable);
  return raw;
}

function deriveAccessoryFake(accessory: "cubo" | "cable", item: any, notes: any) {
  const incluye = notes?.incluye && typeof notes.incluye === "object" ? notes.incluye : {};
  const key = `${accessory}Fake`;
  const explicit = parseStoredBoolean(notes?.[key] ?? incluye?.[key] ?? notes?.accessories?.[key] ?? notes?.accesorios?.[key]);
  if (explicit !== null) return explicit;
  const raw = [item?.includes, notes?.includes, typeof notes?.incluye === "string" ? notes.incluye : ""]
    .map((value) => String(value || ""))
    .join(" ");
  return new RegExp(`${accessory}\\s*(fake|gen[eé]rico)`, "i").test(raw);
}

const LIMITED_APPLE_WARRANTY = "Garantía limitada de Apple";
const APPLE_CARE_WARRANTY = "AppleCare";
const UNACTIVATED_WARRANTY = "1 año de garantía";

function formatWarrantyDate(value: unknown) {
  const raw = String(value || "").trim();
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (!isoDate) return raw;
  const month = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ][Number(isoDate[2]) - 1];
  return month ? `${Number(isoDate[3])} de ${month} de ${isoDate[1]}` : raw;
}

function normalizeWarrantyType(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/apple\s*care/i.test(raw)) return APPLE_CARE_WARRANTY;
  if (/limitad|fabricante|manufacturer|apple/i.test(raw)) return LIMITED_APPLE_WARRANTY;
  return "";
}

function findNestedWarrantyValue(root: any, kind: "type" | "date") {
  const seen = new Set<unknown>();
  const visit = (value: any, path: string[], warrantyContext: boolean): string => {
    if (value === null || value === undefined || seen.has(value)) return "";
    if (typeof value !== "object") {
      const text = typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
      if (!text) return "";
      const key = path.at(-1) || "";
      if (kind === "type" && (/(?:type|tipo|plan|coverage)/i.test(key) || warrantyContext) && /apple\s*care|garant[ií]a\s*limitada|limited\s*warranty/i.test(text)) return text;
      if (kind === "date" && (/(?:date|fecha|hasta|venc|expir|end)/i.test(key) && warrantyContext)) return text;
      return "";
    }
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      const nextContext = warrantyContext || /warranty|garant|applecare|coverage|cobertura/i.test(key);
      const found = visit(child, [...path, key], nextContext);
      if (found) return found;
    }
    return "";
  };
  return visit(root, [], false);
}

function normalizeWatchSize(value: unknown) {
  const match = String(value || "").match(/\b(40|41|42|44|45|46|49)\s*(?:mm)?\b/i);
  return match?.[1] || "";
}

function normalizeWatchConnection(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return /cel/i.test(raw) ? "GPS + Cellular" : (/gps/i.test(raw) ? "GPS" : raw);
}

function deriveWatchMetadata(item: any, notes: any, detail: any) {
  const line = String(notes?.watchType || detail?.watchType || detail?.gama || "").trim();
  const generation = String(notes?.watchSeries || notes?.watchVersion || detail?.watchSeries || detail?.watchVersion || detail?.generacion || "").trim();
  const title = String(item?.title || "");
  const type = /ultra/i.test(line || title) ? "Ultra" : (/watch/i.test(title) || /series|se|normal/i.test(line) ? "Normal" : "");
  const number = generation.replace(/^(?:series|ultra|se)\s*/i, "").trim();
  return {
    type,
    series: type === "Normal" ? number : "",
    version: type === "Ultra" ? number : "",
    connection: normalizeWatchConnection(notes?.watchConnection || detail?.watchConnection || detail?.conexion || detail?.conectividad),
    size: normalizeWatchSize(notes?.watchSize || detail?.["tamaño"] || detail?.tamanio || detail?.tamano || title),
  };
}

function normalizeOpenBoxType(value: unknown) {
  const raw = String(value || "").trim();
  if (/sin\s*uso|unused|sin\s*activar/i.test(raw)) return "Sin uso";
  if (/poco\s*uso|ligero\s*uso|lightly\s*used/i.test(raw)) return "Con muy poco uso";
  return "";
}

function storedWarranty(notes: any, item: any, productCondition: string) {
  const warrantyObject = [notes?.warranty, notes?.garantiaDetalle, notes?.garantia]
    .find((value) => value && typeof value === "object") || {};
  const firstText = (...values: unknown[]) => values
    .map((value) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "")
    .find(Boolean) || "";
  const rawType = firstText(notes?.warrantyType, notes?.garantiaTipo, notes?.tipoGarantia, warrantyObject?.type, warrantyObject?.tipo, findNestedWarrantyValue({ notes, item }, "type"));
  const type = normalizeWarrantyType(rawType);
  const date = firstText(
    notes?.warrantyDate,
    notes?.garantiaFecha,
    warrantyObject?.date,
    warrantyObject?.fecha,
    warrantyObject?.hasta,
    warrantyObject?.detalle,
    typeof notes?.garantia === "string" ? notes.garantia : "",
    findNestedWarrantyValue({ notes, item }, "date"),
  );
  const enabledFlag = parseStoredBoolean(notes?.warrantyEnabled ?? notes?.garantiaActiva ?? warrantyObject?.enabled ?? warrantyObject?.activa);
  const isNew = productCondition === "Nuevo";
  return {
    enabled: isNew || (enabledFlag ?? Boolean(type || date)),
    type: type || (isNew ? LIMITED_APPLE_WARRANTY : (date ? LIMITED_APPLE_WARRANTY : "")),
    date: date || (isNew ? UNACTIVATED_WARRANTY : ""),
  };
}

function formatIncludesAccessories(value: string, cuboFake: boolean, cableFake: boolean) {
  let formatted = String(value || "");
  if (cuboFake && includesAccessory(formatted, "Cubo")) formatted = formatted.replace(/\bCubo\b/i, "Cubo Fake");
  if (cableFake && includesAccessory(formatted, "Cable")) formatted = formatted.replace(/\bCable\b/i, "Cable Fake");
  return formatted;
}

type WatchAccessoryName = "Caja" | "Cable" | "Cable fake" | "Correa" | "Correa fake" | "Otros";

const WATCH_ACCESSORY_OPTIONS: WatchAccessoryName[] = ["Caja", "Cable", "Cable fake", "Correa", "Correa fake", "Otros"];

function includesWatchAccessory(value: string, accessory: WatchAccessoryName) {
  if (accessory === "Otros") return /\botros?\b/i.test(String(value || ""));
  if (accessory === "Cable fake") return /\bcable\s*(?:fake|gen[eé]rico)\b/i.test(String(value || ""));
  if (accessory === "Correa fake") return /\bcorrea\s*(?:fake|gen[eé]rica)\b/i.test(String(value || ""));
  if (accessory === "Cable") return /\bcable\b(?!\s*(?:fake|gen[eé]rico))/i.test(String(value || ""));
  if (accessory === "Correa") return /\bcorrea\b(?!\s*(?:fake|gen[eé]rica))/i.test(String(value || ""));
  return /\bcaja\b/i.test(String(value || ""));
}

function toggleWatchAccessory(value: string, accessory: WatchAccessoryName, checked: boolean) {
  const selected = WATCH_ACCESSORY_OPTIONS.filter((option) => includesWatchAccessory(value, option));
  let next = checked
    ? Array.from(new Set([...selected, accessory]))
    : selected.filter((option) => option !== accessory);
  if (checked && ["Cable", "Cable fake"].includes(accessory)) {
    next = next.filter((option) => option === accessory || !["Cable", "Cable fake"].includes(option));
  }
  if (checked && ["Correa", "Correa fake"].includes(accessory)) {
    next = next.filter((option) => option === accessory || !["Correa", "Correa fake"].includes(option));
  }
  return next.length ? next.join(" + ") : "";
}

function sealedWatchIncludes(current: string) {
  const cable = includesWatchAccessory(current, "Cable fake") ? "Cable fake" : "Cable";
  const strap = includesWatchAccessory(current, "Correa fake") ? "Correa fake" : "Correa";
  return ["Caja", cable, strap].join(" + ");
}

function sealedBasicIncludes(category: string) {
  if (["macbook", "ipad", "iphone"].includes(category)) return "Caja + Cubo + Cable";
  return "Caja sola";
}

function deriveWatchIncludes(item: any, notes: any, detail: any) {
  const selected = new Set<WatchAccessoryName>();
  const inspect = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(inspect);
      return;
    }
    if (typeof value === "object") {
      for (const [key, enabled] of Object.entries(value)) {
        if (parseStoredBoolean(enabled) === false) continue;
        inspect(key);
      }
      return;
    }
    const raw = String(value);
    if (/\bcaja\b/i.test(raw)) selected.add("Caja");
    if (/\bcable\s*(?:fake|gen[eé]rico)\b/i.test(raw)) selected.add("Cable fake");
    else if (/\bcable\b|cargador/i.test(raw)) selected.add("Cable");
    if (/\bcorrea\s*(?:fake|gen[eé]rica)\b/i.test(raw)) selected.add("Correa fake");
    else if (/\bcorrea\b|band|strap/i.test(raw)) selected.add("Correa");
    if (/\botros?\b/i.test(raw)) selected.add("Otros");
  };
  [
    notes?.watchIncludes,
    item?.includes,
    notes?.includes,
    notes?.incluye,
    notes?.accessories,
    notes?.accesorios,
    detail?.includes,
    detail?.incluye,
    detail?.accessories,
    detail?.accesorios,
  ].forEach(inspect);
  return WATCH_ACCESSORY_OPTIONS
    .filter((option) => selected.has(option))
    .join(" + ");
}

function toSlug(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferCategoryFromTitle(title?: string) {
  const t = String(title || "").toLowerCase();
  if (/mac\s*book|macbook/.test(t)) return "macbook";
  if (/\bipad\b/.test(t)) return "ipad";
  if (/\biphone\b/.test(t)) return "iphone";
  if (/watch/.test(t)) return "watch";
  if (/airpods?/.test(t)) return "accesorios";
  return "otros";
}

function normalizeCategory(value: unknown) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw.includes("mac")) return "macbook";
  if (raw.includes("ipad")) return "ipad";
  if (raw.includes("iphone")) return "iphone";
  if (raw.includes("watch")) return "watch";
  if (raw.includes("accesorio") || raw.includes("airpod")) return "accesorios";
  if (raw.includes("otro")) return "otros";
  return raw;
}

function categoryLabel(cat: string) {
  switch (cat) {
    case "macbook": return "MacBook";
    case "ipad": return "iPad";
    case "iphone": return "iPhone";
    case "watch": return "Apple Watch";
    case "accesorios": return "Accesorios";
    default: return "Otros";
  }
}

function buildTitle(tipo: string, gama: string, proc: string, tam: string, iphoneModel?: string, ipadConnectivity?: string, ipadGeneration?: string) {
  const isIphone = String(tipo || "").toLowerCase().includes("iphone");
  const isIpad = String(tipo || "").toLowerCase().includes("ipad");
  if (isIphone) return [tipo, proc, iphoneModel].filter(Boolean).join(" ").trim();
  if (isIpad) {
    const line = gama === "Normal" ? "" : gama;
    const model = gama === "Normal" || gama === "Mini" ? ipadGeneration : proc;
    const screen = tam && tam !== model ? tam : "";
    return [tipo, line, model, screen, ipadConnectivity].filter(Boolean).join(" ").trim();
  }
  return [tipo, gama, proc, tam].filter(Boolean).join(" ").trim();
}

function buildIphoneTitle(number?: number | string | null, model?: string | null, storageGb?: number | string | null, color?: string | null) {
  const n = number ? String(number).trim() : "";
  const m = model ? String(model).trim() : "";
  const s = storageGb ? String(storageGb).trim() : "";
  const c = color ? String(color).trim() : "";
  if (!n || !m || !s || !c) return "";
  const cap = c.charAt(0).toUpperCase() + c.slice(1);
  if (/tb$/i.test(s)) return `iPhone ${n} ${m} ${s.toUpperCase()} ${cap}`.trim();
  return `iPhone ${n} ${m} ${s}GB ${cap}`.trim();
}

function parseIphoneFromTitle(title?: string) {
  const raw = String(title || "").trim();
  if (!raw) return { number: "", model: "" };
  const numberMatch = raw.match(/\biphone\s*(\d{2})\b/i);
  if (!numberMatch) return { number: "", model: "" };

  const number = numberMatch[1];
  const after = raw.slice((numberMatch.index || 0) + numberMatch[0].length).trim();
  let model = "";
  if (/\bpro\s*max\b/i.test(after)) model = "Pro Max";
  else if (/\bpro\b/i.test(after)) model = "Pro";
  else if (/\bplus\b/i.test(after)) model = "Plus";
  else if (/\bmini\b/i.test(after)) model = "Mini";
  else if (/\be\b/i.test(after)) model = "E";
  else model = "Normal";

  return { number, model };
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseIphoneStorageGb(value: string) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return NaN;
  if (/^\d+$/.test(raw)) return Number(raw);
  const tb = raw.match(/^(\d+(?:\.\d+)?)\s*TB$/);
  if (tb) return Math.round(Number(tb[1]) * 1024);
  const gb = raw.match(/^(\d+(?:\.\d+)?)\s*GB$/);
  if (gb) return Math.round(Number(gb[1]));
  return NaN;
}

function normalizeIphoneStorageInput(value: unknown) {
  const s = String(value ?? "").trim();
  if (!s) return "";
  const n = Number(s);
  if (Number.isFinite(n) && n >= 1024 && n % 1024 === 0) return `${n / 1024}TB`;
  return s;
}

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function normalizeSku(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function normalizeManualSku(value: unknown) {
  const raw = normalizeSku(value).replace(/\s+/g, "");
  if (!raw) return "";
  if (/^MS-\d+$/i.test(raw)) return raw.toUpperCase();
  const number = raw.match(/\d+/)?.[0] || "";
  return number ? `MS-${number}` : raw;
}

function displaySku(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .replace(/^prev[-_\s]*svc(?=[-_\s]*\d)/i, "PREV-MS")
    .replace(/^svc(?=[-_\s]*\d)/i, "MS");
}

function withCurrentOption(options: string[], current: string) {
  const value = String(current || "").trim();
  if (!value) return options;
  const has = options.some((o) => o.toLowerCase() === value.toLowerCase());
  return has ? options : [value, ...options];
}

async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "true");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

function getImageExtension(url: string, contentType?: string | null) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const cleanUrl = url.split("?")[0] || "";
  const match = cleanUrl.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() || "jpg";
}

const ZIP_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let j = 0; j < 8; j += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

function getCrc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = ZIP_CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pushZip16(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff);
}

function pushZip32(target: number[], value: number) {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

async function fetchImageForZip(url: string, filenameBase: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar ${filenameBase}`);
  const blob = await res.blob();
  const extension = getImageExtension(url, blob.type);
  const data = await blob.arrayBuffer();
  return { name: `${filenameBase}.${extension}`, data };
}

function createZipBlob(files: { name: string; data: ArrayBuffer }[]) {
  const encoder = new TextEncoder();
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const fileBytes = new Uint8Array(file.data);
    const crc = getCrc32(fileBytes);
    const size = file.data.byteLength;
    const local: number[] = [];
    pushZip32(local, 0x04034b50);
    pushZip16(local, 20);
    pushZip16(local, 0x0800);
    pushZip16(local, 0);
    pushZip16(local, 0);
    pushZip16(local, 0);
    pushZip32(local, crc);
    pushZip32(local, size);
    pushZip32(local, size);
    pushZip16(local, nameBytes.length);
    pushZip16(local, 0);
    local.push(...nameBytes);

    const central: number[] = [];
    pushZip32(central, 0x02014b50);
    pushZip16(central, 20);
    pushZip16(central, 20);
    pushZip16(central, 0x0800);
    pushZip16(central, 0);
    pushZip16(central, 0);
    pushZip16(central, 0);
    pushZip32(central, crc);
    pushZip32(central, size);
    pushZip32(central, size);
    pushZip16(central, nameBytes.length);
    pushZip16(central, 0);
    pushZip16(central, 0);
    pushZip16(central, 0);
    pushZip16(central, 0);
    pushZip32(central, 0);
    pushZip32(central, offset);
    central.push(...nameBytes);

    const localHeader = new Uint8Array(local);
    const centralHeader = new Uint8Array(central);
    localParts.push(localHeader.buffer, file.data);
    centralParts.push(centralHeader.buffer);
    offset += localHeader.byteLength + size;
    centralSize += centralHeader.byteLength;
  });

  const centralStart = offset;
  const end: number[] = [];
  pushZip32(end, 0x06054b50);
  pushZip16(end, 0);
  pushZip16(end, 0);
  pushZip16(end, files.length);
  pushZip16(end, files.length);
  pushZip32(end, centralSize);
  pushZip32(end, centralStart);
  pushZip16(end, 0);

  return new Blob([...localParts, ...centralParts, new Uint8Array(end).buffer], { type: "application/zip" });
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const contentType = res.headers.get("content-type") || "";
  const json = contentType.includes("application/json") ? await res.json() : null;
  if (!res.ok || !json?.ok) {
    const fallback = res.status === 413
      ? "La imagen es demasiado pesada para producción. Prueba con una foto comprimida."
      : `No se pudo subir la imagen (${res.status || "sin respuesta"})`;
    throw new Error(json?.message || fallback);
  }
  return json.url as string;
}

export default function PublishModal({
  item,
  onClose,
  onSaved,
  forceSaleType,
}: {
  item: any;
  onClose: () => void;
  onSaved: (u: any) => void;
  forceSaleType?: SaleType;
}) {
  const notes = React.useMemo(() => {
    try {
      return item?.notes && typeof item.notes === "string" ? JSON.parse(item.notes) : (item?.notes || {});
    } catch {
      return {};
    }
  }, [item]);
  const specs = (notes?.specs || notes) as any;
  const detalle = (specs?.detalle || {}) as any;
  const titleIphoneParsed = React.useMemo(() => parseIphoneFromTitle(item?.title), [item?.title]);

  const legacySalePrice = Number(notes?.precioLista || 0);
  const legacyDiscount = Number(notes?.descuentoPorc || 0);

  const [category, setCategory] = React.useState<string>(() => {
    const hasCategory = item && Object.prototype.hasOwnProperty.call(item, "category");
    if (hasCategory) return String(item?.category || "");
    return inferCategoryFromTitle(item?.title);
  });
  const [catTouched, setCatTouched] = React.useState(false);

  const [title, setTitle] = React.useState(() => {
    const prefer = (item?.title || "").trim();
    if (prefer) return capitalize(prefer);
    const tipo = categoryLabel(item?.category || inferCategoryFromTitle(item?.title));
    const gama0 = detalle?.gama || "";
    const proc0 = detalle?.procesador || "";
    const tam0 = detalle?.["tamaño"] || detalle?.tamanio || detalle?.tamano || "";
    if (String(tipo).toLowerCase().includes("iphone")) {
      const auto = buildIphoneTitle(item?.iphone_number ?? notes?.iphoneNumber, item?.iphone_model || notes?.iphoneModel, item?.storage_gb ?? notes?.storageGb ?? notes?.storage, item?.color || notes?.color || "");
      if (auto) return auto;
    }
    const connectivity0 = detalle?.conectividad || detalle?.conexion || notes?.conectividad || "";
    const generation0 = detalle?.generacion || notes?.generacion || "";
    const raw = buildTitle(tipo, gama0, proc0, tam0, item?.iphone_model || notes?.iphoneModel, connectivity0, generation0);
    return raw ? capitalize(raw) : "";
  });
  const [titleManual, setTitleManual] = React.useState(false);
  const [manualSku, setManualSku] = React.useState<string>(() => normalizeManualSku(item?.sku || notes?.manualSku || notes?.sourceSku || ""));
  const [proc, setProc] = React.useState<string>(detalle?.procesador || "");
  const [gama, setGama] = React.useState<string>(detalle?.gama || "");
  const [tam, setTam] = React.useState<string>(() => {
    const fromDetalle = detalle?.["tamaño"] || detalle?.tamanio || detalle?.tamano || "";
    if (fromDetalle) return String(fromDetalle);
    const m = String(item?.title || "").match(/\b(1[0-9](?:\.[0-9])?)\b/);
    return m ? m[1] : "";
  });
  const normalizeUnit = (val: any, fallbackUnit: "GB" | "TB" = "GB") => {
    if (!val && val !== 0) return "";
    const s = String(val).trim();
    if (!s) return "";
    if (/\\b(gb|tb)\\b/i.test(s)) return s.replace(/\\s+/g, " ");
    if (/^\\d+(\\.\\d+)?$/.test(s)) return `${s} ${fallbackUnit}`;
    return s;
  };
  const normalizeIpadConnectivity = (val: any) => {
    const s = String(val || "").trim();
    if (!s) return "";
    if (/celular/i.test(s)) return "WiFi + Celular";
    if (/wifi/i.test(s)) return "WiFi";
    return s;
  };

  const [ram, setRam] = React.useState<string>(normalizeUnit(detalle?.ram || "", "GB"));
  const [alm, setAlm] = React.useState<string>(normalizeUnit(detalle?.almacenamiento || "", "GB"));
  const [ipadGeneration, setIpadGeneration] = React.useState<string>(String(detalle?.generacion || notes?.generacion || ""));
  const [ipadConnectivity, setIpadConnectivity] = React.useState<string>(normalizeIpadConnectivity(detalle?.conectividad || detalle?.conexion || notes?.conectividad || ""));
  const [keyboardLayout, setKeyboardLayout] = React.useState<string>(() => {
    const raw = String(item?.keyboard_layout || detalle?.teclado || "");
    if (/espanol|español/i.test(raw)) return "Espanol";
    if (/ingles|inglés/i.test(raw)) return "Ingles";
    if (/otro/i.test(raw)) return "Otro";
    return raw || (category === "macbook" ? "Ingles" : "");
  });
  const [ciclos, setCiclos] = React.useState<string>(String(item?.battery_cycles ?? notes?.batteryCycles ?? notes?.bateria?.ciclos ?? ""));
  const [salud, setSalud] = React.useState<string>(String(item?.battery_health ?? notes?.batteryHealth ?? notes?.bateria?.salud ?? ""));
  const [color, setColor] = React.useState<string>(item?.color || notes?.color || specs?.color || detalle?.color || "");
  const [productCondition, setProductCondition] = React.useState<string>(item?.product_condition || notes?.productCondition || notes?.estado || "");
  const [openBoxType, setOpenBoxType] = React.useState<string>(() => normalizeOpenBoxType(notes?.openBoxType || notes?.openBoxCondition || notes?.estadoOpenBox || notes?.descripcion || ""));
  const initialWarranty = storedWarranty(notes, item, productCondition);
  const [hasWarranty, setHasWarranty] = React.useState<boolean>(() => initialWarranty.enabled);
  const [warrantyType, setWarrantyType] = React.useState<string>(() => initialWarranty.type);
  const [warrantyDate, setWarrantyDate] = React.useState<string>(() => formatWarrantyDate(initialWarranty.date));
  const [stock, setStock] = React.useState<number>(() => {
    const initial = Number(item?.__mergeStock ?? item?.stock ?? 1);
    return isFinite(initial) && initial > 0 ? initial : 1;
  });
  const mergeCandidates = React.useMemo<MergeCandidate[]>(() => {
    const candidates = Array.isArray(item?.__mergeCandidates) ? item.__mergeCandidates : [];
    return candidates
      .map((candidate: any) => ({
        id: String(candidate?.id || "").trim(),
        sku: normalizeSku(candidate?.sku),
        title: String(candidate?.title || "").trim(),
      }))
      .filter((candidate: MergeCandidate) => candidate.id && candidate.sku);
  }, [item]);
  const mergeCandidateBySku = React.useMemo(() => {
    const map = new Map<string, MergeCandidate>();
    mergeCandidates.forEach((candidate: MergeCandidate) => map.set(candidate.sku, candidate));
    return map;
  }, [mergeCandidates]);
  const [mergeSkuInputs, setMergeSkuInputs] = React.useState<string[]>(() => {
    const ids = new Set((Array.isArray(item?.__mergeStagedIds) ? item.__mergeStagedIds : []).map((id: unknown) => String(id)));
    const fromCandidates = mergeCandidates.filter((candidate: MergeCandidate) => ids.has(candidate.id)).map((candidate: MergeCandidate) => candidate.sku);
    if (fromCandidates.length) return fromCandidates;
    if (Array.isArray(item?.__mergeInitialSkus) && item.__mergeInitialSkus.length) {
      return item.__mergeInitialSkus.map(normalizeSku).filter(Boolean);
    }
    return Array.isArray(notes?.linkedSkus) ? notes.linkedSkus.map(normalizeSku).filter(Boolean) : [];
  });
  const [iphoneModel, setIphoneModel] = React.useState<string>(
    item?.iphone_model || notes?.iphoneModel || titleIphoneParsed.model || ""
  );
  const [iphoneNumber, setIphoneNumber] = React.useState<string>(
    String(item?.iphone_number ?? notes?.iphoneNumber ?? titleIphoneParsed.number ?? "")
  );
  const [iphoneStorage, setIphoneStorage] = React.useState<string>(
    normalizeIphoneStorageInput(item?.storage_gb ?? notes?.storageGb ?? notes?.storage ?? "")
  );
  const [iphoneSimType, setIphoneSimType] = React.useState<string>(
    String(notes?.iphoneSimType || notes?.simType || notes?.chipType || detalle?.esim || detalle?.sim || "")
  );
  const initialWatch = deriveWatchMetadata(item, notes, detalle);
  const [watchType, setWatchType] = React.useState<string>(initialWatch.type);
  const [watchSeries, setWatchSeries] = React.useState<string>(initialWatch.series);
  const [watchConnection, setWatchConnection] = React.useState<string>(initialWatch.connection);
  const [watchVersion, setWatchVersion] = React.useState<string>(initialWatch.version);
  const [watchSize, setWatchSize] = React.useState<string>(initialWatch.size);
  const [watchAccessories, setWatchAccessories] = React.useState<string>(String(notes?.watchAccessories || item?.includes_extra || notes?.includesExtra || notes?.accesoriosTexto || ""));
  const [watchIncludes, setWatchIncludes] = React.useState<string>(() => deriveWatchIncludes(item, notes, detalle));
  const [includesValue, setIncludesValue] = React.useState<string>(() => deriveIncludesValue(item, notes));
  const [includesExtra, setIncludesExtra] = React.useState<string>(item?.includes_extra || notes?.includesExtra || "");
  const [cuboFake, setCuboFake] = React.useState<boolean>(() => deriveAccessoryFake("cubo", item, notes));
  const [cableFake, setCableFake] = React.useState<boolean>(() => deriveAccessoryFake("cable", item, notes));
  const [descriptionOther, setDescriptionOther] = React.useState<string>(detalle?.descripcionOtro || notes?.descripcionOtro || "");
  const [productDetails, setProductDetails] = React.useState<string>(
    String(detalle?.detalles || detalle?.productDetails || notes?.productDetails || notes?.detalles || "")
  );
  const [images, setImages] = React.useState<string[]>(Array.isArray(item?.images) ? item.images : []);
  const [detailImages, setDetailImages] = React.useState<string[]>(() => {
    const fromNotes = Array.isArray(notes?.detailImages) ? notes.detailImages : Array.isArray(notes?.detailPhotos) ? notes.detailPhotos : [];
    const fromDetail = Array.isArray(detalle?.detailImages) ? detalle.detailImages : [];
    return uniqueStrings([...fromNotes, ...fromDetail]);
  });
  const [showProductDetails, setShowProductDetails] = React.useState(() => Boolean(productDetails.trim() || detailImages.length));
  const [saleType, setSaleType] = React.useState<string>(() => {
    if (forceSaleType) return forceSaleType;
    const st = String(item?.sale_type || notes?.saleType || "").toUpperCase();
    if (st) return st;
    if (legacyDiscount > 0) return "PROMOCION";
    return "VENTA_SIMPLE";
  });
  const [salePrice, setSalePrice] = React.useState<number>(() => {
    const persistedPrice = Number(item?.price ?? notes?.salePrice ?? 0);
    if (persistedPrice > 0) return persistedPrice;
    return legacySalePrice;
  });
  const [preventaDateFrom, setPreventaDateFrom] = React.useState<string>(
    String(notes?.preventaDateFrom || notes?.preventa?.from || "")
  );
  const [preventaDateTo, setPreventaDateTo] = React.useState<string>(
    String(notes?.preventaDateTo || notes?.preventa?.to || "")
  );
  const [discount, setDiscount] = React.useState<number>(Number(item?.discount || legacyDiscount || 0));
  const [discountMode, setDiscountMode] = React.useState<DiscountMode>(() => {
    const raw = String(notes?.discountMode || notes?.discountType || "percent").toLowerCase();
    return raw === "amount" || raw === "flat" || raw === "soles" ? "amount" : "percent";
  });
  const [minOfferPrice, setMinOfferPrice] = React.useState<number>(Number(item?.min_offer_price || 0));
  const finalPrice = React.useMemo(() => {
    if (saleType !== "PROMOCION") return null;
    const p = Number(salePrice || 0);
    const d = Number(discount || 0);
    const computed = discountMode === "amount" ? p - d : p * (1 - d / 100);
    return +Math.max(0, computed).toFixed(2);
  }, [salePrice, discount, discountMode, saleType]);
  const [saving, setSaving] = React.useState(false);
  const [uploadingPhotos, setUploadingPhotos] = React.useState(false);
  const [uploadingDetailPhotos, setUploadingDetailPhotos] = React.useState(false);
  const [submitError, setSubmitError] = React.useState("");
  const [copiedText, setCopiedText] = React.useState(false);
  const [downloadingPhotos, setDownloadingPhotos] = React.useState(false);
  const [variantGroup, setVariantGroup] = React.useState<string>(
    String(item?.variant_group || notes?.variantGroup || notes?.variant_group || "")
  );
  const [dragImageIndex, setDragImageIndex] = React.useState<number | null>(null);
  const [versionConfig, setVersionConfig] = React.useState<ProductVersionConfig>(() => normalizeProductVersionConfig(DEFAULT_PRODUCT_VERSION_CONFIG));
  const detailUploadInFlightRef = React.useRef(false);
  const replacementCandidates = React.useMemo<ReplacementCandidate[]>(() => {
    const candidates = Array.isArray(item?.__replacementCandidates) ? item.__replacementCandidates : [];
    return candidates
      .map((candidate: any) => ({
        id: String(candidate?.id || "").trim(),
        sku: normalizeSku(candidate?.sku),
        title: String(candidate?.title || "").trim(),
        price: candidate?.price,
        status: candidate?.status,
      }))
      .filter((candidate: ReplacementCandidate) => candidate.id && candidate.sku);
  }, [item]);
  const [replacementStagedId, setReplacementStagedId] = React.useState("");
  const [replacingPreventa, setReplacingPreventa] = React.useState(false);
  const canReplacePreventa = Boolean(item?.__isPublishedPreventa && item?.__catalogProductId && replacementCandidates.length);
  const sealedPresets = React.useMemo(() => {
    const seen = new Set<string>();
    return (Array.isArray(item?.__sealedPresets) ? item.__sealedPresets : [])
      .filter((candidate: any) => String(candidate?.id || "") !== String(item?.id || ""))
      .filter((candidate: any) => {
        const candidateNotes = (() => {
          try { return typeof candidate?.notes === "string" ? JSON.parse(candidate.notes) : candidate?.notes || {}; } catch { return {}; }
        })();
        return String(candidate?.product_condition || candidateNotes?.productCondition || candidateNotes?.estado || "") === "Nuevo";
      })
      .filter((candidate: any) => {
        const key = `${candidate?.title || ""}|${candidate?.color || ""}|${JSON.stringify(candidate?.images || [])}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [item]);
  const [sealedPresetId, setSealedPresetId] = React.useState("");

  const keepTypeUnselectedOnManualPreventa = !item?.id && String(item?.category ?? "") === "";

  React.useEffect(() => {
    let alive = true;
    fetch("/api/admin/product-versions", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (alive && json?.ok) setVersionConfig(normalizeProductVersionConfig(json.config));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  React.useEffect(() => {
    if (!catTouched && !keepTypeUnselectedOnManualPreventa) setCategory((c) => c || inferCategoryFromTitle(title));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, keepTypeUnselectedOnManualPreventa]);

  React.useEffect(() => {
    if (productCondition && productCondition !== "Nuevo") {
      setStock(1);
    } else if (productCondition === "Nuevo") {
      setCiclos("");
      setSalud("");
      setHasWarranty(true);
      setWarrantyType(LIMITED_APPLE_WARRANTY);
      setWarrantyDate(UNACTIVATED_WARRANTY);
      setIncludesExtra("");
      setWatchAccessories("");
      if (category === "watch") {
        setWatchIncludes((current) => sealedWatchIncludes(current));
      } else if (category) {
        setIncludesValue(sealedBasicIncludes(category));
        setCuboFake(false);
        setCableFake(false);
      }
    }
    if (productCondition !== "Open Box") setOpenBoxType("");
  }, [productCondition, category]);

  React.useEffect(() => {
    if (productCondition !== "Open Box" || !openBoxType) return;
    setHasWarranty(true);
    if (openBoxType === "Sin uso") {
      setWarrantyType(LIMITED_APPLE_WARRANTY);
      setWarrantyDate(UNACTIVATED_WARRANTY);
      setCiclos("");
      setSalud("");
      return;
    }
    setWarrantyType((current) => normalizeWarrantyType(current) || LIMITED_APPLE_WARRANTY);
    setWarrantyDate((current) => current === UNACTIVATED_WARRANTY ? "" : current);
  }, [productCondition, openBoxType]);

  React.useEffect(() => {
    if (productCondition !== "Nuevo" && !hasWarranty) {
      setWarrantyType("");
      setWarrantyDate("");
    }
  }, [productCondition, hasWarranty]);

  React.useEffect(() => {
    if (category === "macbook" && !keyboardLayout) setKeyboardLayout("Ingles");
  }, [category, keyboardLayout]);

  React.useEffect(() => {
    if (watchType === "Ultra") {
      setWatchSize("49");
      setWatchSeries("");
    } else if (watchType === "Normal") {
      setWatchVersion("");
      setWatchSize((current) => (["42", "46"].includes(current) ? current : ""));
    }
  }, [watchType]);

  React.useEffect(() => {
    if (forceSaleType && saleType !== forceSaleType) {
      setSaleType(forceSaleType);
    }
  }, [forceSaleType, saleType]);

  React.useEffect(() => {
    if (!category) return;
    if (titleManual) return;
    if (category === "iphone") {
      const auto = buildIphoneTitle(iphoneNumber, iphoneModel, iphoneStorage, color);
      if (auto) setTitle(auto);
      return;
    }
    if (category === "otros") {
      if (descriptionOther?.trim()) setTitle(capitalize(descriptionOther.trim()));
      return;
    }
    const auto = buildTitle(categoryLabel(category), gama, proc, tam, iphoneModel, ipadConnectivity, ipadGeneration);
    const base = auto || title;
    if (base) {
      const withPrefix = saleType === "PREVENTA" && !/^preventa\s+/i.test(base) ? `Preventa ${base}` : base;
      setTitle(capitalize(withPrefix));
    }
  }, [category, gama, proc, tam, ipadConnectivity, ipadGeneration, titleManual, descriptionOther, iphoneModel, iphoneNumber, iphoneStorage, color, saleType, title]);

  const isMacbook = category === "macbook";
  const isIpad = category === "ipad";
  const isIphone = category === "iphone";
  const isWatch = category === "watch";
  const isOtros = category === "otros";
  const isUnusedOpenBox = productCondition === "Open Box" && openBoxType === "Sin uso";
  const iphoneNum = Number(iphoneNumber || 0);
  const stockNum = Number(stock || 0);
  const requiredMergeSkuCount = productCondition === "Nuevo" ? Math.max(0, stockNum - 1) : 0;
  const mergeSkuValues = mergeSkuInputs.map(normalizeSku);
  const selectedMergeIds = mergeSkuValues
    .map((sku) => mergeCandidateBySku.get(sku)?.id || "")
    .filter(Boolean);
  const selectedMergeSkus = mergeSkuValues.filter(Boolean);

  const applySealedPreset = (presetId: string) => {
    setSealedPresetId(presetId);
    const preset = sealedPresets.find((candidate: any) => String(candidate?.id || "") === presetId);
    if (!preset) return;
    let presetNotes: any = {};
    try { presetNotes = typeof preset.notes === "string" ? JSON.parse(preset.notes) : preset.notes || {}; } catch {}
    const presetSpecs = presetNotes?.specs || presetNotes;
    const presetDetail = presetSpecs?.detalle || presetNotes?.detalle || {};
    const presetCategory = String(preset.category || presetNotes?.category || presetSpecs?.tipo || inferCategoryFromTitle(preset.title));
    setProductCondition("Nuevo");
    setCategory(normalizeCategory(presetCategory));
    setCatTouched(true);
    setTitle(capitalize(String(preset.title || "")));
    setTitleManual(false);
    setGama(String(presetDetail?.gama || ""));
    setProc(String(presetDetail?.procesador || ""));
    setTam(String(presetDetail?.["tamaño"] || presetDetail?.tamanio || presetDetail?.tamano || ""));
    setRam(normalizeUnit(presetDetail?.ram || "", "GB"));
    setAlm(normalizeUnit(presetDetail?.almacenamiento || "", "GB"));
    setIpadGeneration(String(presetDetail?.generacion || presetNotes?.generacion || ""));
    setIpadConnectivity(normalizeIpadConnectivity(presetDetail?.conectividad || presetDetail?.conexion || presetNotes?.conectividad || ""));
    setKeyboardLayout(String(preset.keyboard_layout || presetDetail?.teclado || ""));
    setColor(String(preset.color || presetNotes?.color || presetSpecs?.color || presetDetail?.color || ""));
    setIphoneNumber(String(preset.iphone_number ?? presetNotes?.iphoneNumber ?? ""));
    setIphoneModel(String(preset.iphone_model || presetNotes?.iphoneModel || ""));
    setIphoneStorage(normalizeIphoneStorageInput(preset.storage_gb ?? presetNotes?.storageGb ?? ""));
    setIphoneSimType(String(presetNotes?.iphoneSimType || presetNotes?.simType || presetDetail?.sim || ""));
    const presetWatch = deriveWatchMetadata(preset, presetNotes, presetDetail);
    setWatchType(presetWatch.type);
    setWatchSeries(presetWatch.series);
    setWatchConnection(presetWatch.connection);
    setWatchVersion(presetWatch.version);
    setWatchSize(presetWatch.size);
    setWatchAccessories(String(presetNotes?.watchAccessories || preset?.includes_extra || presetNotes?.includesExtra || presetNotes?.accesoriosTexto || ""));
    setWatchIncludes(deriveWatchIncludes(preset, presetNotes, presetDetail));
    setDescriptionOther(String(presetDetail?.descripcionOtro || presetNotes?.descripcionOtro || ""));
    setProductDetails(String(presetDetail?.detalles || presetNotes?.productDetails || presetNotes?.detalles || ""));
    setImages(Array.isArray(preset.images) ? preset.images : []);
    setDetailImages(uniqueStrings([...(Array.isArray(presetNotes?.detailImages) ? presetNotes.detailImages : []), ...(Array.isArray(presetDetail?.detailImages) ? presetDetail.detailImages : [])]));
    setVariantGroup(String(preset.variant_group || presetNotes?.variantGroup || preset.title || ""));
  };

  React.useEffect(() => {
    setMergeSkuInputs((current) => {
      const next = current.slice(0, requiredMergeSkuCount);
      while (next.length < requiredMergeSkuCount) next.push("");
      return next;
    });
  }, [requiredMergeSkuCount]);

  const macbookProcessorBase = React.useMemo(() => {
    return versionConfig.macbook.processorsByGama[gama] || [];
  }, [gama, versionConfig]);
  const macbookConfig = React.useMemo(
    () => versionConfig.macbook.configByGamaProcessor[gama]?.[proc] || { sizes: [], rams: [], ssds: [] },
    [gama, proc, versionConfig]
  );
  const macbookProcessorOptions = React.useMemo(() => withCurrentOption(macbookProcessorBase, proc), [macbookProcessorBase, proc]);
  const macbookSizeOptions = React.useMemo(() => withCurrentOption(macbookConfig.sizes, tam), [macbookConfig.sizes, tam]);
  const macbookRamOptions = React.useMemo(() => withCurrentOption(macbookConfig.rams, ram), [macbookConfig.rams, ram]);
  const macbookSsdOptions = React.useMemo(() => withCurrentOption(macbookConfig.ssds, alm), [macbookConfig.ssds, alm]);

  const ipadGenerationBase = React.useMemo(() => {
    return versionConfig.ipad.generationsByGama[gama] || [];
  }, [gama, versionConfig]);
  const ipadProcessorBase = React.useMemo(() => versionConfig.ipad.processorsByGama[gama] || [], [gama, versionConfig]);
  const ipadVersionKey = gama === "Normal" || gama === "Mini" ? ipadGeneration : proc;
  const ipadSizeBase = React.useMemo(() => versionConfig.ipad.sizesByGamaVersion[gama]?.[ipadVersionKey] || [], [gama, ipadVersionKey, versionConfig]);
  const ipadStorageBase = React.useMemo(() => versionConfig.ipad.storageByGamaVersion[gama]?.[ipadVersionKey] || [], [gama, ipadVersionKey, versionConfig]);
  const ipadGenerationOptions = React.useMemo(() => withCurrentOption(ipadGenerationBase, ipadGeneration), [ipadGenerationBase, ipadGeneration]);
  const ipadProcessorOptions = React.useMemo(() => withCurrentOption(ipadProcessorBase, proc), [ipadProcessorBase, proc]);
  const ipadSizeOptions = React.useMemo(() => withCurrentOption(ipadSizeBase, tam), [ipadSizeBase, tam]);
  const ipadStorageOptions = React.useMemo(() => withCurrentOption(ipadStorageBase, alm), [ipadStorageBase, alm]);
  const iphoneModelBase = React.useMemo(() => versionConfig.iphone.modelsByNumber[iphoneNumber] || [], [iphoneNumber, versionConfig]);
  const iphoneStorageBase = React.useMemo(
    () => getIphoneStorageOptionsFromConfig(versionConfig, iphoneNumber, iphoneModel),
    [iphoneNumber, iphoneModel, versionConfig]
  );
  const iphoneModelOptions = React.useMemo(() => withCurrentOption(iphoneModelBase, iphoneModel), [iphoneModelBase, iphoneModel]);
  const iphoneStorageOptions = React.useMemo(() => withCurrentOption(iphoneStorageBase, iphoneStorage), [iphoneStorageBase, iphoneStorage]);

  React.useEffect(() => {
    if (!isMacbook || gama !== "Neo") return;
    if (proc !== "A18 Pro") setProc("A18 Pro");
    if (tam !== "13") setTam("13");
    if (ram !== "8") setRam("8");
    if (alm && !["256", "512"].includes(alm)) setAlm("");
  }, [isMacbook, gama, proc, tam, ram, alm]);

  React.useEffect(() => {
    if (!isIphone) return;
    if ((!iphoneNumber || !iphoneModel) && title) {
      const parsed = parseIphoneFromTitle(title);
      if (!iphoneNumber && parsed.number) setIphoneNumber(parsed.number);
      if (!iphoneModel && parsed.model) setIphoneModel(parsed.model);
    }
  }, [isIphone, iphoneNumber, iphoneModel, title]);

  const errors: string[] = [];
  const requiresBatteryInfo = saleType !== "PREVENTA" && productCondition !== "Nuevo" && !isUnusedOpenBox;
  const normalizedManualSku = normalizeManualSku(manualSku);
  const headerSku = displaySku(
    item?.sku || (normalizedManualSku ? (saleType === "PREVENTA" ? `PREV-${normalizedManualSku}` : normalizedManualSku) : "")
  );
  const isCatalogEdit = Boolean(item?.__catalogProductId || String(item?.status || "").toLowerCase() === "published");
  if (!category) errors.push("Selecciona el tipo de producto");
  if (!saleType) errors.push("Selecciona el tipo de venta");
  if (!salePrice || salePrice <= 0) errors.push("El precio de venta es obligatorio");
  if (!images.length) errors.push("Sube al menos una imagen");
  if (!productCondition) errors.push("Selecciona el estado del producto");
  if (saleType === "PROMOCION") {
    if (!discount || discount <= 0) errors.push("El descuento es obligatorio");
    if (discountMode === "percent" && discount > 100) errors.push("El descuento no puede pasar 100%");
    if (discountMode === "amount" && salePrice > 0 && discount > salePrice) errors.push("El descuento plano no puede ser mayor al precio");
  }
  if (saleType === "OFERTA" && (!minOfferPrice || minOfferPrice <= 0)) errors.push("El precio minimo de oferta es obligatorio");
  if (saleType === "OFERTA" && minOfferPrice && salePrice && Number(minOfferPrice) > Number(salePrice)) {
    errors.push("El minimo de oferta no puede ser mayor al precio de venta");
  }
  if (saleType === "PREVENTA") {
    if (!preventaDateFrom || !preventaDateTo) {
      errors.push("Ingresa el rango de llegada de la preventa");
    } else if (preventaDateFrom > preventaDateTo) {
      errors.push("El rango de llegada de la preventa es inválido");
    }
  }
  if (isMacbook) {
    if (!gama?.trim()) errors.push("La gama es obligatoria");
    if (!proc?.trim()) errors.push("El procesador es obligatorio");
    if (!ram?.trim()) errors.push("La RAM es obligatoria");
    if (!alm?.trim()) errors.push("El SSD es obligatorio");
    if (!tam?.trim()) errors.push("El tamaño de pantalla es obligatorio");
    if (tam && macbookConfig.sizes.length && !macbookConfig.sizes.includes(String(tam))) errors.push("Tamaño inválido para el procesador");
    if (requiresBatteryInfo && !ciclos) errors.push("Los ciclos de batería son obligatorios");
    if (requiresBatteryInfo && !salud) errors.push("La salud de batería es obligatoria");
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (productCondition !== "Nuevo" && !includesValue) errors.push("Selecciona que incluye");
  }
  if (isIpad) {
    if (!gama?.trim()) errors.push("La gama es obligatoria");
    if ((gama === "Air" || gama === "Pro") && !proc?.trim()) errors.push("El procesador es obligatorio");
    if ((gama === "Normal" || gama === "Mini") && !ipadGeneration?.trim()) errors.push("La generación es obligatoria");
    if (ipadSizeBase.length > 0 && !tam?.trim()) errors.push("El tamaño es obligatorio");
    if (tam && ipadSizeBase.length > 0 && !ipadSizeBase.includes(String(tam))) errors.push("Tamaño inválido para la configuración");
    if (ipadStorageBase.length > 0 && !alm?.trim()) errors.push("El almacenamiento es obligatorio");
    if (!ipadConnectivity?.trim()) errors.push("La conectividad es obligatoria");
    if (requiresBatteryInfo && !ciclos) errors.push("Los ciclos de batería son obligatorios");
    if (requiresBatteryInfo && !salud) errors.push("La salud de batería es obligatoria");
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (productCondition !== "Nuevo" && !includesValue) errors.push("Selecciona que incluye");
  }
  if (isIphone) {
    const iphoneStorageParsed = parseIphoneStorageGb(iphoneStorage);
    if (!iphoneModel) errors.push("Selecciona el modelo de iPhone");
    if (!iphoneNumber) errors.push("Selecciona el número de iPhone");
    if (iphoneNumber && !versionConfig.iphone.numbers.includes(iphoneNumber)) errors.push("El número de iPhone es inválido");
    if (iphoneModel && iphoneModelBase.length && !iphoneModelBase.includes(iphoneModel)) errors.push("El modelo no aplica para ese número de iPhone");
    if (!iphoneStorage) errors.push("El almacenamiento es obligatorio");
    if (!iphoneSimType) errors.push("Selecciona si el iPhone usa chip físico o eSIM");
    if (iphoneStorage && (Number.isNaN(iphoneStorageParsed) || iphoneStorageParsed <= 0)) {
      errors.push("El almacenamiento es inválido");
    }
    if (iphoneStorage && iphoneStorageBase.length && !iphoneStorageBase.includes(iphoneStorage)) {
      errors.push("El almacenamiento no aplica para ese modelo");
    }
    if (requiresBatteryInfo && iphoneNum >= 15 && !ciclos) {
      errors.push("Los ciclos de batería son obligatorios desde iPhone 15");
    }
    if (requiresBatteryInfo && !salud) errors.push("La salud de batería es obligatoria");
    if (iphoneNumber && Number(iphoneNumber) <= 0) errors.push("El número de iPhone es inválido");
    if (productCondition !== "Nuevo" && salud && (Number(salud) < 1 || Number(salud) > 100)) {
      errors.push("La salud de batería es inválida");
    }
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (productCondition !== "Nuevo" && !includesValue) errors.push("Selecciona que incluye");
  }
  if (isWatch) {
    if (!watchType) errors.push("Selecciona el tipo de Watch");
    if (!watchConnection) errors.push("Selecciona la conexión");
    if (watchType === "Normal") {
      if (!watchSeries) errors.push("Selecciona la serie");
      if (!["42", "46"].includes(watchSize)) errors.push("Selecciona el tamaño de 42 mm o 46 mm");
    }
    if (watchType === "Ultra") {
      if (!watchVersion) errors.push("Selecciona la versión");
      if (watchSize !== "49") errors.push("El Apple Watch Ultra debe ser de 49 mm");
    }
    if (includesWatchAccessory(watchIncludes, "Otros") && !watchAccessories.trim()) {
      errors.push("Describe los otros accesorios del Apple Watch");
    }
    if (!color?.trim()) errors.push("El color es obligatorio");
  }
  if (isOtros) {
    if (!descriptionOther?.trim()) errors.push("Describe el producto (Otros)");
    if (productCondition !== "Nuevo" && !includesValue) errors.push("Selecciona que incluye");
    if (!color?.trim()) errors.push("El color es obligatorio");
  }
  if (productCondition !== "Nuevo" && includesValue === "Otros" && !includesExtra?.trim()) {
    errors.push("Describe lo que incluye");
  }
  if (productCondition === "Open Box" && !openBoxType) {
    errors.push("Selecciona el tipo de Open Box");
  }
  const warrantyIsEnabled = productCondition === "Nuevo" || productCondition === "Open Box" || hasWarranty;
  if (warrantyIsEnabled && !warrantyType) {
    errors.push("Selecciona el tipo de garantía");
  }
  if (warrantyIsEnabled && warrantyType === LIMITED_APPLE_WARRANTY && !warrantyDate.trim()) {
    errors.push("Ingresa la fecha de la garantía limitada de Apple");
  }
  if (productCondition === "Nuevo" && stockNum < 1) {
    errors.push("El stock debe ser mayor o igual a 1");
  }
  if (requiredMergeSkuCount > 0) {
    const filledSkus = mergeSkuValues.filter(Boolean);
    if (filledSkus.length !== requiredMergeSkuCount) {
      errors.push(`Agrega ${requiredMergeSkuCount} SKU adicional(es) para este stock`);
    }
    const duplicatedSkus = filledSkus.filter((sku, index) => filledSkus.indexOf(sku) !== index);
    if (duplicatedSkus.length) {
      errors.push("No repitas el mismo SKU adicional");
    }
    if (filledSkus.includes(normalizeSku(item?.sku))) errors.push("No pongas el mismo SKU principal como adicional");
  }
  if (productCondition && productCondition !== "Nuevo" && stockNum !== 1) {
    errors.push("El stock debe ser 1 para Usado/Open Box/Arreglado");
  }

  const canPublish = errors.length === 0 && !saving && !uploadingPhotos && !uploadingDetailPhotos;

  const addFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploadingPhotos(true);
    setSubmitError("");
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadFile(f);
        urls.push(url);
      }
      setImages((arr) => [...arr, ...urls]);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudieron subir las fotos");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const addDetailFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    if (detailUploadInFlightRef.current) return;
    detailUploadInFlightRef.current = true;
    setUploadingDetailPhotos(true);
    setSubmitError("");
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadFile(f);
        urls.push(url);
      }
      setDetailImages((arr) => uniqueStrings([...arr, ...urls]));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudieron subir las fotos de detalles");
    } finally {
      detailUploadInFlightRef.current = false;
      setUploadingDetailPhotos(false);
    }
  };

  const setAccessoryIncluded = (accessory: AccessoryName, checked: boolean) => {
    const flags = {
      Caja: includesAccessory(includesValue, "Caja"),
      Cubo: includesAccessory(includesValue, "Cubo"),
      Cable: includesAccessory(includesValue, "Cable"),
    };
    flags[accessory] = checked;
    setIncludesValue(includesFromFlags(flags.Caja, flags.Cubo, flags.Cable));
    setIncludesExtra("");
    if (!checked && accessory === "Cubo") setCuboFake(false);
    if (!checked && accessory === "Cable") setCableFake(false);
  };

  const moveImage = React.useCallback((from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setImages((arr) => {
      if (from >= arr.length || to >= arr.length) return arr;
      const copy = arr.slice();
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return copy;
    });
  }, []);

  const getCurrentTitle = () => {
    let baseTitle = title;
    if (!titleManual && category === "iphone") {
      const auto = buildIphoneTitle(iphoneNumber, iphoneModel, iphoneStorage, color);
      baseTitle = auto || title;
    } else if (!titleManual && category === "otros") {
      baseTitle = descriptionOther.trim();
    } else if (!titleManual) {
      const autoTitle = buildTitle(categoryLabel(category), gama, proc, tam, iphoneModel, ipadConnectivity, ipadGeneration);
      baseTitle = autoTitle || title;
    }
    if (saleType === "PREVENTA" && baseTitle && !/^preventa\s+/i.test(baseTitle)) {
      baseTitle = `Preventa ${baseTitle}`;
    }
    return capitalize(baseTitle.trim());
  };

  const buildProductCopyText = () => {
    const lines: string[] = [];
    const add = (label: string, value: unknown) => {
      const text = String(value ?? "").trim();
      if (text) lines.push(`${label}: ${text}`);
    };
    const titleValue = getCurrentTitle();
    if (titleValue) lines.push(titleValue);
    add("SKU", headerSku);
    if (selectedMergeSkus.length) {
      add("SKU adicionales del stock", selectedMergeSkus.map(displaySku).join(", "));
    }
    add("Tipo", categoryLabel(category));
    if (isMacbook) {
      add("Gama", gama);
      add("Procesador", proc);
      add("RAM", normalizeUnit(ram, "GB"));
      add("SSD", normalizeUnit(alm, "GB"));
      add("Pantalla", tam ? `${tam}"` : "");
      add("Teclado", keyboardLayout);
    } else if (isIpad) {
      add("Gama", gama);
      add("Generacion", ipadGeneration);
      add("Procesador", proc);
      add("Almacenamiento", normalizeUnit(alm, "GB"));
      add("Pantalla", tam ? `${tam}"` : "");
      add("Conectividad", ipadConnectivity);
    } else if (isIphone) {
      add("Modelo", [iphoneNumber ? `iPhone ${iphoneNumber}` : "", iphoneModel].filter(Boolean).join(" "));
      add("Almacenamiento", iphoneStorage ? String(iphoneStorage).toUpperCase().replace(/^(\d+)$/, "$1 GB") : "");
      add("SIM", iphoneSimType);
    } else if (isWatch) {
      add("Tipo de Watch", watchType);
      add("Serie", watchSeries);
      add("Conexion", watchConnection);
      add("Version", watchVersion);
      add("Tamaño", watchSize ? `${watchSize} mm` : "");
      if (includesWatchAccessory(watchIncludes, "Otros")) add("Otros accesorios", watchAccessories);
    } else if (isOtros) {
      add("Descripcion", descriptionOther);
    }
    add("Color", color);
    add("Estado", productCondition === "Open Box" && openBoxType ? `Open Box - ${openBoxType}` : productCondition);
    if (productCondition === "Nuevo" || isUnusedOpenBox) {
      lines.push("Bateria: Nueva");
    } else {
      add("Salud de bateria", salud ? `${salud}%` : "");
      add("Ciclos de carga", ciclos);
    }
    add("Incluye", isWatch
      ? watchIncludes
      : (includesValue === "Otros" ? includesExtra : formatIncludesAccessories(includesValue, cuboFake, cableFake)));
    if (productCondition === "Nuevo" || productCondition === "Open Box" || hasWarranty) {
      add("Tipo de garantia", warrantyType);
      const warrantyIso = warrantyDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
      const warrantyForCopy = warrantyIso
        ? `${Number(warrantyIso[3])} de ${[
            "enero", "febrero", "marzo", "abril", "mayo", "junio",
            "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
          ][Number(warrantyIso[2]) - 1]} de ${warrantyIso[1]}`
        : warrantyDate;
      add("Garantia", warrantyForCopy);
    }
    if (showProductDetails) add("Detalles", productDetails);
    if (salePrice) add("Precio", `S/ ${Number(salePrice || 0).toFixed(2)}`);
    if (saleType === "PROMOCION" && finalPrice !== null) add("Precio promocional", `S/ ${Number(finalPrice || 0).toFixed(2)}`);
    if (saleType === "OFERTA") add("Minimo de oferta", `S/ ${Number(minOfferPrice || 0).toFixed(2)}`);
    return lines.filter(Boolean).join("\n");
  };

  const onCopyText = async () => {
    setSubmitError("");
    try {
      await copyTextToClipboard(buildProductCopyText());
      setCopiedText(true);
      window.setTimeout(() => setCopiedText(false), 1800);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo copiar el texto");
    }
  };

  const onDownloadPhotos = async () => {
    const allPhotos = [
      ...images.map((url, index) => ({ url, name: index === 0 ? "producto-portada" : `producto-foto-${index + 1}` })),
      ...detailImages.map((url, index) => ({ url, name: `producto-detalle-${index + 1}` })),
    ];
    if (!allPhotos.length || downloadingPhotos) return;
    setDownloadingPhotos(true);
    setSubmitError("");
    try {
      const base = toSlug(getCurrentTitle()) || "producto";
      const zipFiles = [];
      for (const photo of allPhotos) {
        zipFiles.push(await fetchImageForZip(photo.url, `${base}-${photo.name}`));
      }
      downloadBlob(createZipBlob(zipFiles), `${base}-fotos.zip`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudieron descargar las fotos");
    } finally {
      setDownloadingPhotos(false);
    }
  };

  const onReplacePreventa = async () => {
    if (!canReplacePreventa || !replacementStagedId || replacingPreventa) return;
    const selected = replacementCandidates.find((candidate) => candidate.id === replacementStagedId);
    const ok = window.confirm(
      `¿Suplantar esta preventa con ${selected?.title || selected?.sku || "el producto seleccionado"}?`
    );
    if (!ok) return;
    setReplacingPreventa(true);
    setSubmitError("");
    try {
      await replacePreventaWithInventory(String(item.__catalogProductId), replacementStagedId);
      onSaved({ ...item, __replacedPreventa: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo suplantar la preventa");
    } finally {
      setReplacingPreventa(false);
    }
  };

  const onPublish = async () => {
    if (!canPublish) return;
    setSaving(true);
    setSubmitError("");
    let createdManualDraftId = "";
    try {
      const iphoneStorageGbParsed = parseIphoneStorageGb(iphoneStorage);
      const iphoneStorageValue = iphoneStorage ? String(iphoneStorage).trim().toUpperCase() : "";
      const iphoneStorageGb = Number.isFinite(iphoneStorageGbParsed) ? iphoneStorageGbParsed : null;
      const includesPayload = isWatch ? watchIncludes : includesValue;
      const includesExtraPayload = isWatch && includesWatchAccessory(watchIncludes, "Otros") ? watchAccessories.trim() : includesExtra;
      const includesFlags = {
        caja: includesAccessory(includesPayload, "Caja"),
        cubo: includesAccessory(includesPayload, "Cubo"),
        cable: includesAccessory(includesPayload, "Cable"),
      };
      const warrantyEnabled = productCondition === "Nuevo" || productCondition === "Open Box" ? true : hasWarranty;
      const warrantyValue = warrantyEnabled
        ? ((productCondition === "Nuevo" || isUnusedOpenBox) ? UNACTIVATED_WARRANTY : (warrantyDate.trim() || null))
        : null;
      const warrantyTypeValue = warrantyEnabled
        ? (normalizeWarrantyType(warrantyType) || LIMITED_APPLE_WARRANTY)
        : null;
      const almacenamientoVal = isIphone ? iphoneStorageValue : normalizeUnit(alm, "GB");
      const productDetailsValue = showProductDetails ? productDetails.trim() : "";
      const detailImageValues = showProductDetails ? uniqueStrings(detailImages) : [];
      const detalleNew = {
        ...(detalle || {}),
        gama,
        generacion: ipadGeneration,
        procesador: proc,
        ["tamaño"]: isWatch ? watchSize : tam,
        tamanio: isWatch ? watchSize : tam,
        ram: normalizeUnit(ram, "GB"),
        almacenamiento: almacenamientoVal,
        conectividad: ipadConnectivity,
        teclado: keyboardLayout,
        esim: isIphone ? (iphoneSimType || null) : (detalle as any)?.esim,
        sim: isIphone ? (iphoneSimType || null) : (detalle as any)?.sim,
        descripcionOtro: descriptionOther,
        detalles: productDetailsValue || null,
        productDetails: productDetailsValue || null,
        detailImages: null,
        detailPhotos: null,
      };
      const specsNew = { ...(specs || {}), tipo: categoryLabel(category), detalle: detalleNew } as any;
      const newNotes = {
        ...(notes || {}),
        specs: { ...specsNew, estado: productCondition },
        variantGroup: variantGroup.trim() || null,
        bateria: { ciclos, salud },
        color,
        productCondition,
        openBoxType: productCondition === "Open Box" ? openBoxType : null,
        incluye: includesFlags,
        includes: includesPayload,
        includesExtra: includesExtraPayload,
        cuboFake: includesAccessory(includesValue, "Cubo") && cuboFake,
        cableFake: includesAccessory(includesValue, "Cable") && cableFake,
        accessories: {
          ...includesFlags,
          cuboFake: includesAccessory(includesValue, "Cubo") && cuboFake,
          cableFake: includesAccessory(includesValue, "Cable") && cableFake,
        },
        accesorios: {
          ...includesFlags,
          cuboFake: includesAccessory(includesValue, "Cubo") && cuboFake,
          cableFake: includesAccessory(includesValue, "Cable") && cableFake,
        },
        productDetails: productDetailsValue || null,
        detalles: productDetailsValue || null,
        detailImages: detailImageValues,
        detailPhotos: null,
        preventaDateFrom: saleType === "PREVENTA" ? preventaDateFrom : null,
        preventaDateTo: saleType === "PREVENTA" ? preventaDateTo : null,
        preventa: saleType === "PREVENTA" ? { from: preventaDateFrom, to: preventaDateTo } : null,
        warrantyEnabled,
        warrantyType: warrantyTypeValue,
        warrantyDate: warrantyValue,
        garantiaActiva: warrantyEnabled,
        garantiaTipo: warrantyTypeValue,
        garantiaFecha: warrantyValue,
        garantia: warrantyValue,
        warranty: { enabled: warrantyEnabled, type: warrantyTypeValue, date: warrantyValue },
        garantiaDetalle: { activa: warrantyEnabled, tipo: warrantyTypeValue, fecha: warrantyValue },
        iphoneModel,
        iphoneNumber: iphoneNumber ? Number(iphoneNumber) : null,
        storageGb: iphoneStorage ? iphoneStorageGb : null,
        iphoneSimType: iphoneSimType || null,
        simType: iphoneSimType || null,
        batteryCycles: ciclos ? Number(ciclos) : null,
        batteryHealth: salud ? Number(salud) : null,
        watchType: watchType || null,
        watchSeries: watchSeries || null,
        watchConnection: watchConnection || null,
        watchVersion: watchVersion || null,
        watchSize: isWatch ? watchSize || null : null,
        watchAccessories: watchAccessories || null,
        watchIncludes: watchIncludes || null,
        saleType,
        salePrice,
        manualSku: normalizedManualSku || null,
        discount: saleType === "PROMOCION" ? discount : null,
        discountMode: saleType === "PROMOCION" ? discountMode : null,
        finalPrice: saleType === "PROMOCION" ? finalPrice : null,
        minOfferPrice: saleType === "OFERTA" ? minOfferPrice : null,
        detalle: detalleNew,
      };
      let baseTitle = title;
      if (!titleManual && category === "iphone") {
        const auto = buildIphoneTitle(iphoneNumber, iphoneModel, iphoneStorage, color);
        baseTitle = auto || title;
      } else if (!titleManual && category === "otros") baseTitle = descriptionOther.trim();
      else if (!titleManual) {
        const autoTitle = buildTitle(categoryLabel(category), gama, proc, tam, iphoneModel, ipadConnectivity, ipadGeneration);
        baseTitle = autoTitle || title;
      }
      if (saleType === "PREVENTA" && baseTitle && !/^preventa\s+/i.test(baseTitle)) {
        baseTitle = `Preventa ${baseTitle}`;
      }
      const fixedTitle = capitalize(baseTitle.trim());
      let stagedId = String(item?.id || "").trim();
      if (!stagedId) {
        const created = await createManualPreventaDraft({
          saleType: saleType as SaleType,
          category,
          sku: normalizedManualSku,
          title: fixedTitle || "Preventa",
          stock: productCondition === "Nuevo" ? Number(stock || 1) : 1,
          price: Number(salePrice || 0),
        });
        const newId = String((created?.item as any)?.id || "").trim();
        if (!created?.ok || !newId) throw new Error(created?.error || "No se pudo crear el borrador de preventa");
        stagedId = newId;
        createdManualDraftId = newId;
      }
      const updateResult = await updateStaged(stagedId, {
        title: fixedTitle,
        price: String(salePrice),
        images,
        stock: productCondition === "Nuevo" ? Number(stock || 1) : 1,
        notes: JSON.stringify(newNotes),
        category,
        productCondition,
        iphoneModel,
        iphoneNumber: iphoneNumber ? Number(iphoneNumber) : null,
        storageGb: iphoneStorage ? iphoneStorageGb : null,
        batteryCycles: ciclos ? Number(ciclos) : null,
        batteryHealth: salud ? Number(salud) : null,
        color: color || null,
        includes: includesPayload,
        includesExtra: includesExtraPayload,
        keyboardLayout,
        variantGroup: variantGroup.trim() || null,
        saleType,
        discount: saleType === "PROMOCION" ? discount : null,
        discountMode: saleType === "PROMOCION" ? discountMode : null,
        finalPrice: saleType === "PROMOCION" ? finalPrice : null,
        minOfferPrice: saleType === "OFERTA" ? minOfferPrice : null,
      });
      if (!updateResult.ok) throw new Error(updateResult.error || "No se pudo guardar el producto");
      const mergeStagedIds = productCondition === "Nuevo" && Number(stock || 1) > 1
        ? selectedMergeIds
        : [];
      const mergeStagedSkus = productCondition === "Nuevo" && Number(stock || 1) > 1
        ? selectedMergeSkus
        : [];
      const publishResult = await publishStaged(stagedId, { slug: toSlug(fixedTitle), mergeStagedIds, mergeStagedSkus });
      if (!publishResult.ok) throw new Error(publishResult.error || "No se pudo publicar el producto");
      onSaved({
        ...item,
        id: stagedId,
        title: fixedTitle,
        price: String(salePrice),
        images,
        stock: productCondition === "Nuevo" ? Number(stock || 1) : 1,
        notes: JSON.stringify(newNotes),
        sale_type: saleType,
        discount: saleType === "PROMOCION" ? String(discount) : null,
        final_price: saleType === "PROMOCION" ? String(finalPrice) : null,
        min_offer_price: saleType === "OFERTA" ? String(minOfferPrice) : null,
        iphone_model: iphoneModel,
        iphone_number: iphoneNumber ? Number(iphoneNumber) : null,
        storage_gb: iphoneStorage ? iphoneStorageGb : null,
        battery_cycles: ciclos ? Number(ciclos) : null,
        battery_health: salud ? Number(salud) : null,
        color: color || null,
        product_condition: productCondition,
        includes: includesPayload,
        includes_extra: includesExtraPayload,
        keyboard_layout: keyboardLayout,
        variant_group: variantGroup.trim() || null,
        __mergeStagedIds: mergeStagedIds,
      });
    } catch (err) {
      if (createdManualDraftId) {
        await deleteStaged(createdManualDraftId).catch(() => {});
      }
      setSubmitError(err instanceof Error ? err.message : "No se pudo publicar el producto");
    } finally {
      setSaving(false);
    }
  };

  const mainPhotosPanel = (
    <div>
      <label className="block text-sm mb-1 text-gray-700">Fotos</label>
      {images.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl border-2 border-emerald-500 bg-emerald-50">
          <div className="relative aspect-[4/3] bg-white">
            <img src={images[0]} alt="" className="h-full w-full object-contain" />
            <div className="absolute left-2 top-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
              Portada
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-2">
        {images.map((u, i) => (
          <div
            key={`${u}-${i}`}
            draggable
            onDragStart={(e) => {
              setDragImageIndex(i);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragImageIndex ?? Number(e.dataTransfer.getData("text/plain"));
              moveImage(from, i);
              setDragImageIndex(null);
            }}
            onDragEnd={() => setDragImageIndex(null)}
            className={`cursor-grab overflow-hidden rounded-xl border bg-white active:cursor-grabbing ${
              dragImageIndex === i ? "scale-[0.98] opacity-55" : ""
            } ${i === 0 ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200"}`}
          >
            <div className="relative aspect-square bg-gray-50">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <div className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${i === 0 ? "bg-emerald-600 text-white" : "bg-white/90 text-gray-700"}`}>
                {i === 0 ? "Portada" : `Foto ${i + 1}`}
              </div>
              <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                Arrastra
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1">
              <button
                type="button"
                disabled={i === 0}
                className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 disabled:bg-emerald-100 disabled:text-emerald-700"
                onClick={() => setImages(arr => { const copy = arr.slice(); const [img] = copy.splice(i, 1); copy.unshift(img); return copy; })}
              >
                {i === 0 ? "Actual" : "Portada"}
              </button>
              <button
                type="button"
                className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                onClick={() => setImages(arr => arr.filter((_, idx) => idx !== i))}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (uploadingPhotos || saving) return;
          addFiles(e.dataTransfer.files);
        }}
        className={`mt-3 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          uploadingPhotos || saving
            ? "border-gray-200 bg-gray-50 text-gray-400"
            : "border-blue-200 bg-blue-50/55 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/avif"
          disabled={uploadingPhotos || saving}
          onChange={(e) => {
            addFiles(e.target.files);
            e.currentTarget.value = "";
          }}
          className="sr-only"
        />
        <span className="text-sm font-semibold">{uploadingPhotos ? "Subiendo fotos..." : "Elegir o arrastrar fotos"}</span>
        <span className="mt-1 text-xs text-gray-500">JPG, PNG o AVIF. Puedes seleccionar varias imágenes.</span>
      </label>
      {uploadingPhotos && <p className="text-xs text-blue-600 mt-1">Subiendo fotos...</p>}
      <p className="text-xs text-gray-500 mt-1">La foto marcada como portada será la primera imagen del producto.</p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl text-gray-900 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <h3 className="text-xl font-semibold sm:text-2xl">{isCatalogEdit ? "Editar producto" : "Publicar producto"}</h3>
            {headerSku && (
              <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 font-mono text-sm font-semibold text-gray-700">
                {headerSku}
              </span>
            )}
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700" aria-label="Cerrar">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 px-4 sm:px-6 pb-6">
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-900">Título</label>
            <input
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleManual(true); }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
            />
            {isOtros && (
              <p className="text-xs text-gray-500">Se autogenera desde la descripcion hasta que lo edites manualmente.</p>
            )}
            {isIphone && (
              <p className="text-xs text-gray-500">Se autogenera con los datos del iPhone hasta que lo edites manualmente.</p>
            )}
            {!item?.id && (
              <div>
                <label className="mt-3 block text-sm font-medium text-gray-900">SKU</label>
                <input
                  value={manualSku}
                  onChange={(e) => setManualSku(e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  placeholder="MS-303"
                />
                <p className="mt-1 text-xs text-gray-500">
                  En preventa se guardara como {normalizedManualSku ? `PREV-${normalizedManualSku}` : "PREV-MS-..."}.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
              <label className="block text-sm font-medium text-gray-800">Grupo de variantes</label>
              <input
                value={variantGroup}
                onChange={(e) => setVariantGroup(e.target.value)}
                className="mt-1 w-full border border-blue-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                placeholder="Ej: iphone-15-pro-256"
              />
              <p className="mt-1 text-xs text-gray-600">
                Usa el mismo grupo en productos parecidos para mostrarlos como opciones en la ficha pública.
              </p>
            </div>

            {item?.__isPublishedPreventa && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <div className="text-sm font-semibold text-gray-900">Suplantar preventa</div>
                {replacementCandidates.length > 0 ? (
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <select
                      value={replacementStagedId}
                      onChange={(e) => setReplacementStagedId(e.target.value)}
                      className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    >
                      <option value="">Producto del inventario</option>
                      {replacementCandidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.title || candidate.sku} · {candidate.sku}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!replacementStagedId || replacingPreventa}
                      onClick={onReplacePreventa}
                      className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {replacingPreventa ? "Suplantando..." : "Suplantar"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-gray-600">No hay productos disponibles en inventario.</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-700">Tipo</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setCatTouched(true); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
              >
                <option value="">Seleccione tipo</option>
                <option value="macbook">MacBook</option>
                <option value="ipad">iPad</option>
                <option value="iphone">iPhone</option>
                <option value="watch">Watch</option>
                <option value="accesorios">Accesorios</option>
                <option value="otros">Otros</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Se autocompleta desde el titulo; puedes ajustarlo.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700">Estado</label>
                <select value={productCondition} onChange={(e) => setProductCondition(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                  <option value="">Seleccionar</option>
                  <option value="Nuevo">Sellado (Nuevo)</option>
                  <option value="Usado">Usado</option>
                  <option value="Open Box">Open Box</option>
                  <option value="Arreglado">Arreglado</option>
                </select>
              </div>
              {productCondition === "Open Box" && (
                <div>
                  <label className="block text-sm text-gray-700">Tipo de Open Box</label>
                  <select value={openBoxType} onChange={(e) => setOpenBoxType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                    <option value="">Seleccionar</option>
                    <option value="Sin uso">Sin uso</option>
                    <option value="Con muy poco uso">Con muy poco uso</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">En la tienda ambos se mostrarán simplemente como Open Box.</p>
                </div>
              )}
              {productCondition === "Nuevo" && (
                <div>
                  <label className="block text-sm text-gray-700">Stock</label>
                  <input type="number" min={1} value={stock} onChange={(e) => setStock(Math.max(1, Number(e.target.value || 1)))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]" />
                </div>
              )}
              {productCondition === "Nuevo" && sealedPresets.length > 0 && (
                <div className="col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
                  <label className="block text-sm font-medium text-gray-800">Reutilizar datos de un producto sellado</label>
                  <select value={sealedPresetId} onChange={(e) => applySealedPreset(e.target.value)} className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-gray-900">
                    <option value="">Seleccionar producto anterior</option>
                    {sealedPresets.map((preset: any) => (
                      <option key={preset.id} value={preset.id}>{displaySku(preset.sku)} · {preset.title}{preset.color ? ` · ${preset.color}` : ""}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-600">Copia características, color y fotos; conserva el SKU y el precio del producto actual.</p>
                </div>
              )}
              {productCondition === "Nuevo" && requiredMergeSkuCount > 0 && (
                <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <div className="text-sm font-medium text-gray-800">SKU adicionales para este stock</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {mergeSkuInputs.map((value, index) => (
                      <input key={index} value={value} list={`merge-skus-${String(item?.id || "nuevo")}`} onChange={(e) => { const next = mergeSkuInputs.slice(); next[index] = e.target.value; setMergeSkuInputs(next); }} className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900" placeholder={`SKU adicional ${index + 1}`} />
                    ))}
                  </div>
                  <datalist id={`merge-skus-${String(item?.id || "nuevo")}`}>
                    {mergeCandidates.map((candidate) => <option key={candidate.id} value={candidate.sku}>{candidate.title || candidate.sku}</option>)}
                  </datalist>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-sm font-medium text-gray-800">
              <input
                type="checkbox"
                checked={showProductDetails}
                onChange={(e) => setShowProductDetails(e.target.checked)}
                className="h-4 w-4"
              />
              Agregar detalles del producto
            </label>

            {showProductDetails && (
              <>
                <div>
                  <label className="block text-sm text-gray-700">Detalles del producto</label>
                  <textarea
                    value={productDetails}
                    onChange={(e) => setProductDetails(e.target.value)}
                    rows={4}
                    className="w-full resize-y border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    placeholder="Ej: Detalles esteticos, observaciones o informacion adicional para la ficha publica."
                  />
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-3">
                  <label className="block text-sm font-medium text-gray-700">Fotos de detalles</label>
                  {detailImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {detailImages.map((u, i) => (
                        <div key={`${u}-${i}`} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                          <div className="relative aspect-square bg-gray-50">
                            <img src={u} alt="" className="h-full w-full object-cover" />
                            <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                              Detalle {i + 1}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="w-full bg-red-50 px-2 py-1.5 text-xs font-medium text-red-700"
                            onClick={() => setDetailImages((arr) => arr.filter((_, idx) => idx !== i))}
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (uploadingDetailPhotos || saving) return;
                      addDetailFiles(e.dataTransfer.files);
                    }}
                    className={`mt-3 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-5 text-center transition ${
                      uploadingDetailPhotos || saving
                        ? "border-gray-200 bg-gray-50 text-gray-400"
                        : "border-emerald-200 bg-emerald-50/55 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50"
                    }`}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/avif"
                      disabled={uploadingDetailPhotos || saving}
                      onChange={(e) => {
                        addDetailFiles(e.target.files);
                        e.currentTarget.value = "";
                      }}
                      className="sr-only"
                    />
                    <span className="text-sm font-semibold">{uploadingDetailPhotos ? "Subiendo detalles..." : "Elegir o arrastrar fotos de detalles"}</span>
                    <span className="mt-1 text-xs text-gray-500">Estas fotos apareceran en el boton publico Ver fotos de detalles.</span>
                  </label>
                </div>
              </>
            )}

            {isOtros && (
              <div>
                <label className="block text-sm text-gray-700">Descripcion (Otros)</label>
                <input
                  value={descriptionOther}
                  onChange={(e) => setDescriptionOther(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                />
              </div>
            )}

            {isMacbook && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700">Gama</label>
                  <select
                    value={gama}
                    onChange={(e) => {
                      const nextGama = e.target.value;
                      setGama(nextGama);
                      setProc(nextGama === "Neo" ? "A18 Pro" : "");
                      setTam(nextGama === "Neo" ? "13" : "");
                      setRam(nextGama === "Neo" ? "8" : "");
                      setAlm("");
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccione</option>
                    {versionConfig.macbook.gamas.map((g) => (<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Procesador</label>
                  <select
                    value={proc}
                    onChange={(e) => {
                      setProc(e.target.value);
                      setTam("");
                      setRam("");
                      setAlm("");
                    }}
                    disabled={gama === "Neo"}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccione</option>
                    {macbookProcessorOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Tamaño</label>
                  <select value={tam} onChange={(e) => setTam(e.target.value)} disabled={gama === "Neo"} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff] disabled:bg-gray-100 disabled:text-gray-500">
                    <option value="">Seleccione</option>
                    {macbookSizeOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">RAM</label>
                  <select value={ram} onChange={(e) => setRam(e.target.value)} disabled={gama === "Neo"} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff] disabled:bg-gray-100 disabled:text-gray-500">
                    <option value="">Seleccione</option>
                    {macbookRamOptions.map((r) => (<option key={r} value={r}>{r} GB</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Almacenamiento</label>
                  <select value={alm} onChange={(e) => setAlm(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                    <option value="">Seleccione</option>
                    {macbookSsdOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Teclado</label>
                  <select value={keyboardLayout} onChange={(e) => setKeyboardLayout(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                    <option value="">Seleccionar</option>
                    <option value="Ingles">Inglés</option>
                    <option value="Espanol">Español</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Ciclos de batería</label>
                  <input
                    type="number"
                    value={ciclos}
                    onChange={(e) => setCiclos(e.target.value)}
                    disabled={productCondition === "Nuevo"}
                    placeholder={productCondition === "Nuevo" ? "No aplica para Nuevo" : ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff] disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Salud (%)</label>
                  <input
                    type="number"
                    value={salud}
                    onChange={(e) => setSalud(e.target.value)}
                    disabled={productCondition === "Nuevo"}
                    placeholder={productCondition === "Nuevo" ? "No aplica para Nuevo" : ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff] disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>
            )}

            {isIpad && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700">Gama</label>
                  <select
                    value={gama}
                    onChange={(e) => {
                      setGama(e.target.value);
                      setProc("");
                      setIpadGeneration("");
                      setTam("");
                      setAlm("");
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccione</option>
                    {versionConfig.ipad.gamas.map((g) => (<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
                {(gama === "Normal" || gama === "Mini") && (
                  <div>
                    <label className="block text-sm text-gray-700">Generación</label>
                    <select
                      value={ipadGeneration}
                      onChange={(e) => {
                        setIpadGeneration(e.target.value);
                        setAlm("");
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    >
                      <option value="">Seleccione</option>
                      {ipadGenerationOptions.map((g) => (<option key={g} value={g}>{g}</option>))}
                    </select>
                  </div>
                )}
                {(gama === "Air" || gama === "Pro") && (
                  <div>
                    <label className="block text-sm text-gray-700">Procesador</label>
                    <select
                      value={proc}
                      onChange={(e) => {
                        setProc(e.target.value);
                        setTam("");
                        setAlm("");
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    >
                      <option value="">Seleccione</option>
                      {ipadProcessorOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
                    </select>
                  </div>
                )}
                {ipadSizeOptions.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-700">Tamaño de pantalla</label>
                    <select value={tam} onChange={(e) => setTam(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                      <option value="">Seleccione</option>
                      {ipadSizeOptions.map((s) => (<option key={s} value={s}>{s} pulgadas</option>))}
                    </select>
                  </div>
                )}
                {ipadStorageOptions.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-700">Almacenamiento</label>
                    <select value={alm} onChange={(e) => setAlm(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                      <option value="">Seleccione</option>
                      {ipadStorageOptions.map((s) => (<option key={s} value={s}>{/^\d+$/.test(s) ? `${s} GB` : s}</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-700">Conectividad</label>
                  <select value={ipadConnectivity} onChange={(e) => setIpadConnectivity(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                    <option value="">Seleccione</option>
                    <option value="WiFi">WiFi</option>
                    <option value="WiFi + Celular">WiFi + Celular</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Ciclos de batería</label>
                  <input
                    type="number"
                    value={ciclos}
                    onChange={(e) => setCiclos(e.target.value)}
                    disabled={productCondition === "Nuevo"}
                    placeholder={productCondition === "Nuevo" ? "No aplica para Nuevo" : ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff] disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Salud (%)</label>
                  <input
                    type="number"
                    value={salud}
                    onChange={(e) => setSalud(e.target.value)}
                    disabled={productCondition === "Nuevo"}
                    placeholder={productCondition === "Nuevo" ? "No aplica para Nuevo" : ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff] disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>
            )}

            {isIphone && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700">Número</label>
                  <select
                    value={iphoneNumber}
                    onChange={(e) => {
                      setIphoneNumber(e.target.value);
                      setIphoneModel("");
                      setIphoneStorage("");
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccione</option>
                    {versionConfig.iphone.numbers.map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Modelo iPhone</label>
                  <select
                    value={iphoneModel}
                    onChange={(e) => {
                      setIphoneModel(e.target.value);
                      setIphoneStorage("");
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccione</option>
                    {iphoneModelOptions.map((m) => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Almacenamiento</label>
                  <select
                    value={iphoneStorage}
                    onChange={(e) => setIphoneStorage(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccione</option>
                    {iphoneStorageOptions.map((a) => (
                      <option key={a} value={a}>
                        {/tb$/i.test(a) ? a.toUpperCase() : `${a} GB`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">SIM</label>
                  <select
                    value={iphoneSimType}
                    onChange={(e) => setIphoneSimType(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccione</option>
                    {versionConfig.iphone.simTypes.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Ciclos de batería (desde iPhone 15)</label>
                  <input
                    type="number"
                    value={ciclos}
                    onChange={(e) => setCiclos(e.target.value)}
                    disabled={productCondition === "Nuevo"}
                    placeholder={productCondition === "Nuevo" ? "No aplica para Nuevo" : ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff] disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Salud batería (%)</label>
                  <input
                    type="number"
                    value={salud}
                    onChange={(e) => setSalud(e.target.value)}
                    disabled={productCondition === "Nuevo"}
                    placeholder={productCondition === "Nuevo" ? "No aplica para Nuevo" : ""}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff] disabled:bg-gray-100 disabled:text-gray-500"
                  />
                </div>
              </div>
            )}

            {isWatch && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700">Tipo Watch</label>
                  <select value={watchType} onChange={(e) => setWatchType(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                    <option value="">Seleccionar</option>
                    <option value="Normal">Normal</option>
                    <option value="Ultra">Ultra</option>
                  </select>
                </div>
                {watchType === "Normal" && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-700">Serie</label>
                      <select value={watchSeries} onChange={(e) => setWatchSeries(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                        <option value="">Seleccionar</option>
                        {versionConfig.watch.normalSeries.map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Tamaño de pantalla</label>
                      <select value={watchSize} onChange={(e) => setWatchSize(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                        <option value="">Seleccionar</option>
                        <option value="42">42 mm</option>
                        <option value="46">46 mm</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm text-gray-700">Conexión</label>
                  <select value={watchConnection} onChange={(e) => setWatchConnection(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                    <option value="">Seleccionar</option>
                    <option value="GPS">GPS</option>
                    <option value="GPS + Cellular">GPS + Cellular</option>
                  </select>
                </div>
                {watchType === "Ultra" && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-700">Versión</label>
                      <select value={watchVersion} onChange={(e) => setWatchVersion(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                        <option value="">Seleccionar</option>
                        {versionConfig.watch.ultraVersions.map((s) => (<option key={s} value={s}>{s}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700">Tamaño de pantalla</label>
                      <input value="49 mm" disabled className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-600" />
                    </div>
                  </>
                )}
                <div className="col-span-2 rounded-xl border border-gray-200 bg-white/80 p-3">
                  <label className="block text-sm font-medium text-gray-800">Accesorios incluidos</label>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {WATCH_ACCESSORY_OPTIONS
                      .filter((accessory) => productCondition !== "Nuevo" || accessory !== "Otros")
                      .map((accessory) => (
                      <label key={accessory} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={includesWatchAccessory(watchIncludes, accessory)}
                          disabled={productCondition === "Nuevo" && includesWatchAccessory(watchIncludes, accessory)}
                          onChange={(e) => {
                            setWatchIncludes((current) => toggleWatchAccessory(current, accessory, e.target.checked));
                            if (accessory === "Otros" && !e.target.checked) setWatchAccessories("");
                          }}
                          className="h-4 w-4"
                        />
                        {accessory}
                      </label>
                    ))}
                  </div>
                  {includesWatchAccessory(watchIncludes, "Otros") && (
                    <div className="mt-3">
                      <label className="block text-sm text-gray-700">Describe los otros accesorios</label>
                      <input value={watchAccessories} onChange={(e) => setWatchAccessories(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]" placeholder="Ej.: correa adicional, protector" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700">¿Garantía?</label>
                <label className="inline-flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    checked={productCondition === "Nuevo" || productCondition === "Open Box" ? true : hasWarranty}
                    disabled={productCondition === "Nuevo" || productCondition === "Open Box"}
                    onChange={(e) => setHasWarranty(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">
                    {productCondition === "Nuevo" ? "Sí, producto nuevo" : productCondition === "Open Box" ? "Sí, Open Box" : "Sí, tiene garantía"}
                  </span>
                </label>
              </div>
              {warrantyIsEnabled && (
                <div>
                  <label className="block text-sm text-gray-700">Tipo de garantía</label>
                  <select
                    value={warrantyType}
                    onChange={(e) => setWarrantyType(e.target.value)}
                    disabled={productCondition === "Nuevo" || isUnusedOpenBox}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccionar</option>
                    <option value={LIMITED_APPLE_WARRANTY}>{LIMITED_APPLE_WARRANTY}</option>
                    <option value={APPLE_CARE_WARRANTY}>{APPLE_CARE_WARRANTY}</option>
                  </select>
                </div>
              )}
              {warrantyIsEnabled && (
                <div>
                  <label className="block text-sm text-gray-700">
                    Fecha de garantía{warrantyType === APPLE_CARE_WARRANTY ? " (opcional)" : ""}
                  </label>
                  <input
                    value={warrantyDate}
                    onChange={(e) => setWarrantyDate(e.target.value)}
                    disabled={productCondition === "Nuevo" || isUnusedOpenBox}
                    placeholder="Ej.: hasta 19/02/2027 o 1 año"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700">Color</label>
                <input value={color} onChange={(e) => setColor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]" placeholder="Midnight / Silver" />
              </div>
              {!isWatch && (
                <div className="col-span-2 rounded-xl border border-gray-200 bg-white/80 p-3">
                  <label className="block text-sm font-medium text-gray-800">¿Qué incluye?</label>
                  <p className="mt-0.5 text-xs text-gray-500">{productCondition === "Nuevo" ? "Producto sellado: solo se guardan los accesorios básicos." : "Marca cada accesorio. Puedes combinar Caja, Cubo y Cable libremente."}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(["Caja", "Cubo", "Cable"] as AccessoryName[]).map((accessory) => {
                      const included = includesAccessory(includesValue, accessory);
                      return (
                        <div key={accessory} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-800">
                            <input
                              type="checkbox"
                              checked={included}
                              disabled={productCondition === "Nuevo"}
                              onChange={(e) => setAccessoryIncluded(accessory, e.target.checked)}
                              className="h-4 w-4"
                            />
                            {accessory}
                          </label>
                          {productCondition !== "Nuevo" && included && accessory !== "Caja" && (
                            <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                              <input
                                type="checkbox"
                                checked={accessory === "Cubo" ? cuboFake : cableFake}
                                onChange={(e) => accessory === "Cubo" ? setCuboFake(e.target.checked) : setCableFake(e.target.checked)}
                              />
                              Genérico / fake
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {productCondition !== "Nuevo" && <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIncludesValue("Ninguno");
                        setIncludesExtra("");
                        setCuboFake(false);
                        setCableFake(false);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${includesValue === "Ninguno" ? "border-gray-700 bg-gray-100 text-gray-900" : "border-gray-300 bg-white text-gray-700"}`}
                    >
                      Ninguno
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIncludesValue("Otros");
                        setCuboFake(false);
                        setCableFake(false);
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${includesValue === "Otros" ? "border-gray-700 bg-gray-100 text-gray-900" : "border-gray-300 bg-white text-gray-700"}`}
                    >
                      Otros
                    </button>
                  </div>}
                  {productCondition !== "Nuevo" && includesValue === "Otros" && (
                    <input
                      value={includesExtra}
                      onChange={(e) => setIncludesExtra(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                      placeholder="Especifica"
                    />
                  )}
                  {includesValue && includesValue !== "Otros" && (
                    <p className="mt-2 text-xs text-gray-600">
                      Se guardará: <span className="font-medium text-gray-800">{formatIncludesAccessories(includesValue, cuboFake, cableFake)}</span>
                    </p>
                  )}
                </div>
              )}
              {saleType === "PREVENTA" && (
                <div className="col-span-2 grid grid-cols-2 gap-3 border border-amber-200 bg-amber-50/60 rounded-lg p-3">
                  <div>
                    <label className="block text-sm text-gray-700">Llega entre (desde)</label>
                    <input
                      type="date"
                      value={preventaDateFrom}
                      onChange={(e) => setPreventaDateFrom(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700">Llega entre (hasta)</label>
                    <input
                      type="date"
                      value={preventaDateTo}
                      onChange={(e) => setPreventaDateTo(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm">Tipo de venta</label>
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value)}
                disabled={Boolean(forceSaleType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
              >
                {forceSaleType ? (
                  <option value={forceSaleType}>{forceSaleType}</option>
                ) : (
                  <>
                    <option value="PREVENTA">PREVENTA</option>
                    <option value="VENTA_SIMPLE">VENTA_SIMPLE</option>
                    <option value="PROMOCION">PROMOCION</option>
                    <option value="OFERTA">OFERTA</option>
                  </>
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Precio de venta (S/)</label>
                <input type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]" />
              </div>
              {saleType === "PROMOCION" && (
                <div className="space-y-2">
                  <label className="block text-sm">Descuento</label>
                  <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2">
                    <input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    />
                    <select
                      value={discountMode}
                      onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}
                      className="w-full border border-gray-300 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                    >
                      <option value="percent">%</option>
                      <option value="amount">S/</option>
                    </select>
                  </div>
                </div>
              )}
              {saleType === "OFERTA" && (
                <div>
                  <label className="block text-sm">Minimo de oferta (S/)</label>
                  <input type="number" value={minOfferPrice} onChange={(e) => setMinOfferPrice(Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]" />
                </div>
              )}
            </div>

            {saleType === "PROMOCION" && finalPrice !== null && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                Precio promocional: <span className="text-lg font-semibold">S/ {Number(finalPrice || 0).toFixed(2)}</span>
                {salePrice > 0 && (
                  <span className="ml-2 line-through text-rose-400">S/ {Number(salePrice || 0).toFixed(2)}</span>
                )}
                <span className="ml-2 text-xs font-semibold uppercase tracking-[0.16em]">
                  {discountMode === "amount" ? `Ahorra S/ ${Number(discount || 0).toFixed(2)}` : `${Number(discount || 0)}% OFF`}
                </span>
              </div>
            )}

            {errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">
                {errors.map((e) => (
                  <div key={e}>• {e}</div>
                ))}
              </div>
            )}
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">
                {submitError}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={!canPublish} onClick={onPublish} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50">{saving ? 'Publicando...' : 'Publicar'}</button>
              <button type="button" onClick={onCopyText} className="px-4 py-2 rounded bg-gray-900 text-white">{copiedText ? "Copiado" : "Copiar texto"}</button>
              <button type="button" disabled={downloadingPhotos || (!images.length && !detailImages.length)} onClick={onDownloadPhotos} className="px-4 py-2 rounded bg-sky-600 text-white disabled:opacity-50">{downloadingPhotos ? "Descargando..." : "Descargar fotos"}</button>
            </div>

            {mainPhotosPanel}
          </div>
        </div>
      </div>
    </div>
  );
}



