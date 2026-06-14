"use client";
import React from "react";
import { createManualPreventaDraft, updateStaged, publishStaged, replacePreventaWithInventory } from "../../actions";

type SaleType = "PREVENTA" | "VENTA_SIMPLE" | "PROMOCION" | "OFERTA";
type DiscountMode = "percent" | "amount";
type MergeCandidate = { id: string; sku: string; title: string };
type ReplacementCandidate = { id: string; sku: string; title: string; price?: string | number; status?: string };

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

const MACBOOK_GAMA_OPTIONS = ["Air", "Pro", "Neo"];
const MACBOOK_PROCESSORS_AIR = ["M1", "M2", "M3", "M4", "M5"];
const MACBOOK_PROCESSORS_PRO = [
  "M1", "M2", "M3", "M4", "M5",
  "M1 Pro", "M2 Pro", "M3 Pro", "M4 Pro",
  "M1 Max", "M2 Max", "M3 Max", "M4 Max",
];
const MACBOOK_PROCESSORS_NEO = ["A18 Pro"];

function getMacbookConfig(gama: string, procesador: string) {
  const p = String(procesador || "").trim();
  let sizes: string[] = [];
  let rams: string[] = [];
  let ssds: string[] = [];

  if (gama === "Neo") {
    if (p === "A18 Pro") { sizes = ["13"]; rams = ["8"]; ssds = ["256", "512"]; }
  } else if (gama === "Air") {
    if (p === "M1") { sizes = ["13"]; rams = ["8", "16"]; ssds = ["256", "512", "1TB", "2TB"]; }
    else if (p === "M2") { sizes = ["13", "15"]; rams = ["8", "16", "24"]; ssds = ["256", "512", "1TB", "2TB"]; }
    else if (p === "M3") { sizes = ["13", "15"]; rams = ["8", "16", "24"]; ssds = ["256", "512", "1TB", "2TB"]; }
    else if (p === "M4") { sizes = ["13", "15"]; rams = ["16", "24", "32"]; ssds = ["256", "512", "1TB", "2TB"]; }
    else if (p === "M5") { sizes = ["13", "15"]; rams = ["16", "24", "32"]; ssds = ["256", "512", "1TB", "2TB"]; }
  } else if (gama === "Pro") {
    if (p === "M1") { sizes = ["13"]; rams = ["8", "16"]; ssds = ["256", "512", "1TB", "2TB"]; }
    else if (p === "M1 Pro") { sizes = ["14", "16"]; rams = ["16", "32"]; ssds = ["512", "1TB", "2TB"]; }
    else if (p === "M1 Max") { sizes = ["14", "16"]; rams = ["32", "64"]; ssds = ["512", "1TB", "2TB", "4TB", "8TB"]; }
    else if (p === "M2") { sizes = ["13"]; rams = ["8", "16", "24"]; ssds = ["256", "512", "1TB", "2TB"]; }
    else if (p === "M2 Pro") { sizes = ["14", "16"]; rams = ["16", "32", "36"]; ssds = ["512", "1TB", "2TB"]; }
    else if (p === "M2 Max") { sizes = ["14", "16"]; rams = ["32", "64", "96"]; ssds = ["512", "1TB", "2TB", "4TB", "8TB"]; }
    else if (p === "M3") { sizes = ["14"]; rams = ["8", "16", "24"]; ssds = ["512", "1TB", "2TB"]; }
    else if (p === "M3 Pro") { sizes = ["14", "16"]; rams = ["18", "36"]; ssds = ["512", "1TB", "2TB", "4TB"]; }
    else if (p === "M3 Max") { sizes = ["14", "16"]; rams = ["36", "48", "64"]; ssds = ["1TB", "2TB", "4TB", "8TB"]; }
    else if (p === "M4") { sizes = ["14"]; rams = ["8", "16", "24"]; ssds = ["512", "1TB", "2TB"]; }
    else if (p === "M4 Pro") { sizes = ["14", "16"]; rams = ["24", "48"]; ssds = ["512", "1TB", "2TB", "4TB"]; }
    else if (p === "M4 Max") { sizes = ["14", "16"]; rams = ["48", "64", "128"]; ssds = ["1TB", "2TB", "4TB", "8TB"]; }
    else if (p === "M5") { sizes = ["14"]; rams = ["16", "24"]; ssds = ["512", "1TB", "2TB"]; }
  }
  return { sizes, rams, ssds };
}

const IPAD_GAMA_OPTIONS = ["Normal", "Mini", "Air", "Pro"];
const IPAD_GENERACIONES_NORMALES = ["8", "9", "10", "11"];
const IPAD_GENERACIONES_MINI = ["6", "7"];
const IPAD_PROCESSADORES_AIR = ["M1", "M2", "M3"];
const IPAD_PROCESSADORES_PRO = ["M1", "M2", "M4", "M5"];

function getIpadProcesadores(gama: string) {
  if (gama === "Air") return IPAD_PROCESSADORES_AIR;
  if (gama === "Pro") return IPAD_PROCESSADORES_PRO;
  return [] as string[];
}

function getIpadTamanos(gama: string, procesador: string, generacion: string) {
  if (gama === "Normal") {
    if (["8", "9"].includes(generacion)) return ["10.2"];
    if (generacion === "10") return ["10.9"];
    if (generacion === "11") return ["11"];
  }
  if (gama === "Air" && ["M2", "M3"].includes(procesador)) return ["11", "13"];
  if (gama === "Pro") {
    if (["M1", "M2"].includes(procesador)) return ["11", "12.9"];
    if (["M4", "M5"].includes(procesador)) return ["11", "13"];
  }
  return [] as string[];
}

function getIpadAlmacenamiento(gama: string, generacion: string, procesador: string) {
  if (gama === "Normal") {
    if (generacion === "8") return ["32", "128"];
    if (["9", "10"].includes(generacion)) return ["64", "256"];
    if (generacion === "11") return ["128", "256", "512"];
    return [] as string[];
  }
  if (gama === "Mini") {
    if (generacion === "6") return ["64", "256"];
    if (generacion === "7") return ["128", "256", "512"];
    return [] as string[];
  }
  if (gama === "Air") {
    if (procesador === "M1") return ["64", "128", "256"];
    if (["M2", "M3"].includes(procesador)) return ["128", "256", "512"];
  }
  if (gama === "Pro") {
    if (["M1", "M2"].includes(procesador)) return ["128", "256", "512", "1TB", "2TB"];
    if (["M4", "M5"].includes(procesador)) return ["256", "512", "1TB", "2TB"];
  }
  return [] as string[];
}

const IPHONE_NUMBER_OPTIONS = ["11", "12", "13", "14", "15", "16", "17"];
const IPHONE_MODELS_BY_NUMBER: Record<string, string[]> = {
  "11": ["Normal", "Pro", "Pro Max"],
  "12": ["Mini", "Normal", "Pro", "Pro Max"],
  "13": ["Mini", "Normal", "Pro", "Pro Max"],
  "14": ["Normal", "Plus", "Pro", "Pro Max"],
  "15": ["Normal", "Plus", "Pro", "Pro Max"],
  "16": ["Normal", "Plus", "Pro", "Pro Max", "E"],
  "17": ["Normal", "Plus", "Pro", "Pro Max", "E"],
};

function getIphoneModelOptions(numero: string) {
  return IPHONE_MODELS_BY_NUMBER[String(numero || "")] || [];
}

function getIphoneStorageOptions(numero: string, modelo: string) {
  const n = parseInt(String(numero || ""), 10);
  if (!Number.isFinite(n) || !modelo) return [] as string[];
  if (n >= 11 && n <= 12) return ["64", "128", "256"];
  if (n >= 13 && n <= 16) {
    if (["Pro", "Pro Max"].includes(modelo)) {
      if (n <= 14) return ["128", "256", "512"];
      return ["256", "512", "1TB"];
    }
    return ["128", "256", "512"];
  }
  if (n === 17) return ["256", "512", "1TB"];
  return [] as string[];
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
    const connectivity0 = detalle?.conectividad || notes?.conectividad || "";
    const generation0 = detalle?.generacion || notes?.generacion || "";
    const raw = buildTitle(tipo, gama0, proc0, tam0, item?.iphone_model || notes?.iphoneModel, connectivity0, generation0);
    return raw ? capitalize(raw) : "";
  });
  const [titleManual, setTitleManual] = React.useState(false);
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
  const [ipadConnectivity, setIpadConnectivity] = React.useState<string>(normalizeIpadConnectivity(detalle?.conectividad || notes?.conectividad || ""));
  const [keyboardLayout, setKeyboardLayout] = React.useState<string>(() => {
    const raw = String(item?.keyboard_layout || detalle?.teclado || "");
    if (/espanol|español/i.test(raw)) return "Espanol";
    if (/ingles|inglés/i.test(raw)) return "Ingles";
    if (/otro/i.test(raw)) return "Otro";
    return raw;
  });
  const [ciclos, setCiclos] = React.useState<string>(notes?.bateria?.ciclos || "");
  const [salud, setSalud] = React.useState<string>(notes?.bateria?.salud || "");
  const [color, setColor] = React.useState<string>(item?.color || notes?.color || "");
  const [productCondition, setProductCondition] = React.useState<string>(item?.product_condition || notes?.productCondition || notes?.estado || "");
  const [hasWarranty, setHasWarranty] = React.useState<boolean>(() => {
    if (productCondition === "Nuevo") return true;
    const raw = notes?.warrantyEnabled ?? notes?.garantiaActiva;
    return Boolean(raw);
  });
  const [warrantyDate, setWarrantyDate] = React.useState<string>(() => {
    if (productCondition === "Nuevo") return "1 año de garantía";
    const raw = notes?.warrantyDate ?? notes?.garantiaFecha ?? notes?.garantia ?? "";
    return String(raw || "");
  });
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
  const [watchType, setWatchType] = React.useState<string>(String(notes?.watchType || ""));
  const [watchSeries, setWatchSeries] = React.useState<string>(String(notes?.watchSeries || ""));
  const [watchConnection, setWatchConnection] = React.useState<string>(() => {
    const raw = String(notes?.watchConnection || "");
    return /cellular/i.test(raw) ? "GPS + Cellular" : raw;
  });
  const [watchVersion, setWatchVersion] = React.useState<string>(String(notes?.watchVersion || ""));
  const [watchAccessories, setWatchAccessories] = React.useState<string>(String(notes?.watchAccessories || ""));
  const [watchIncludes, setWatchIncludes] = React.useState<string>(String(notes?.watchIncludes || ""));
  const [includesValue, setIncludesValue] = React.useState<string>(item?.includes || notes?.includes || "");
  const [includesExtra, setIncludesExtra] = React.useState<string>(item?.includes_extra || notes?.includesExtra || "");
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
    if (legacySalePrice > 0) return legacySalePrice;
    return Number(item?.price || 0);
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

  const keepTypeUnselectedOnManualPreventa = !item?.id && String(item?.category ?? "") === "";

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
      setWarrantyDate("1 año de garantía");
    }
  }, [productCondition]);

  React.useEffect(() => {
    if (productCondition !== "Nuevo" && !hasWarranty) setWarrantyDate("");
    if (productCondition !== "Nuevo" && warrantyDate === "1 año de garantía") setWarrantyDate("");
  }, [productCondition, hasWarranty, warrantyDate]);

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
      const withPrefix = saleType === "PREVENTA" && !/^preventa\\s+/i.test(base) ? `Preventa ${base}` : base;
      setTitle(capitalize(withPrefix));
    }
  }, [category, gama, proc, tam, ipadConnectivity, ipadGeneration, titleManual, descriptionOther, iphoneModel, iphoneNumber, iphoneStorage, color, saleType, title]);

  const isMacbook = category === "macbook";
  const isIpad = category === "ipad";
  const isIphone = category === "iphone";
  const isWatch = category === "watch";
  const isOtros = category === "otros";
  const iphoneNum = Number(iphoneNumber || 0);
  const stockNum = Number(stock || 0);
  const requiredMergeSkuCount = productCondition === "Nuevo" ? Math.max(0, stockNum - 1) : 0;
  const mergeSkuValues = mergeSkuInputs.map(normalizeSku);
  const selectedMergeIds = mergeSkuValues
    .map((sku) => mergeCandidateBySku.get(sku)?.id || "")
    .filter(Boolean);
  const selectedMergeSkus = mergeSkuValues.filter(Boolean);

  React.useEffect(() => {
    setMergeSkuInputs((current) => {
      const next = current.slice(0, requiredMergeSkuCount);
      while (next.length < requiredMergeSkuCount) next.push("");
      return next;
    });
  }, [requiredMergeSkuCount]);

  const iphoneIncludesOptions = React.useMemo(
    () => ["Caja + Cable", "Caja sola", "Cable solo", "Otros", "Ninguno"],
    []
  );
  const macbookProcessorBase = React.useMemo(() => {
    if (gama === "Air") return MACBOOK_PROCESSORS_AIR;
    if (gama === "Pro") return MACBOOK_PROCESSORS_PRO;
    if (gama === "Neo") return MACBOOK_PROCESSORS_NEO;
    return [] as string[];
  }, [gama]);
  const macbookConfig = React.useMemo(() => getMacbookConfig(gama, proc), [gama, proc]);
  const macbookProcessorOptions = React.useMemo(() => withCurrentOption(macbookProcessorBase, proc), [macbookProcessorBase, proc]);
  const macbookSizeOptions = React.useMemo(() => withCurrentOption(macbookConfig.sizes, tam), [macbookConfig.sizes, tam]);
  const macbookRamOptions = React.useMemo(() => withCurrentOption(macbookConfig.rams, ram), [macbookConfig.rams, ram]);
  const macbookSsdOptions = React.useMemo(() => withCurrentOption(macbookConfig.ssds, alm), [macbookConfig.ssds, alm]);

  const ipadGenerationBase = React.useMemo(() => {
    if (gama === "Normal") return IPAD_GENERACIONES_NORMALES;
    if (gama === "Mini") return IPAD_GENERACIONES_MINI;
    return [] as string[];
  }, [gama]);
  const ipadProcessorBase = React.useMemo(() => getIpadProcesadores(gama), [gama]);
  const ipadSizeBase = React.useMemo(() => getIpadTamanos(gama, proc, ipadGeneration), [gama, proc, ipadGeneration]);
  const ipadStorageBase = React.useMemo(() => getIpadAlmacenamiento(gama, ipadGeneration, proc), [gama, ipadGeneration, proc]);
  const ipadGenerationOptions = React.useMemo(() => withCurrentOption(ipadGenerationBase, ipadGeneration), [ipadGenerationBase, ipadGeneration]);
  const ipadProcessorOptions = React.useMemo(() => withCurrentOption(ipadProcessorBase, proc), [ipadProcessorBase, proc]);
  const ipadSizeOptions = React.useMemo(() => withCurrentOption(ipadSizeBase, tam), [ipadSizeBase, tam]);
  const ipadStorageOptions = React.useMemo(() => withCurrentOption(ipadStorageBase, alm), [ipadStorageBase, alm]);
  const iphoneModelBase = React.useMemo(() => getIphoneModelOptions(iphoneNumber), [iphoneNumber]);
  const iphoneStorageBase = React.useMemo(() => getIphoneStorageOptions(iphoneNumber, iphoneModel), [iphoneNumber, iphoneModel]);
  const iphoneModelOptions = React.useMemo(() => withCurrentOption(iphoneModelBase, iphoneModel), [iphoneModelBase, iphoneModel]);
  const iphoneStorageOptions = React.useMemo(() => withCurrentOption(iphoneStorageBase, iphoneStorage), [iphoneStorageBase, iphoneStorage]);

  React.useEffect(() => {
    if (!isMacbook) return;
    if (gama === "Neo") {
      if (proc !== "A18 Pro") setProc("A18 Pro");
      if (tam !== "13") setTam("13");
      if (ram !== "8") setRam("8");
      if (alm && !["256", "512"].includes(alm)) setAlm("");
      return;
    }
    if (gama && !MACBOOK_GAMA_OPTIONS.includes(gama)) setGama("");
    if (proc && !macbookProcessorBase.includes(proc)) {
      setProc("");
      setTam("");
      setRam("");
      setAlm("");
      return;
    }
    if (tam && !macbookConfig.sizes.includes(tam)) setTam("");
    if (ram && !macbookConfig.rams.includes(ram)) setRam("");
    if (alm && !macbookConfig.ssds.includes(alm)) setAlm("");
  }, [isMacbook, gama, proc, tam, ram, alm, macbookProcessorBase, macbookConfig]);

  React.useEffect(() => {
    if (!isIpad) return;
    if (gama && !IPAD_GAMA_OPTIONS.includes(gama)) setGama("");
    if ((gama === "Normal" || gama === "Mini")) {
      if (proc) setProc("");
    } else if (ipadGeneration) {
      setIpadGeneration("");
    }
    if (ipadGeneration && !ipadGenerationBase.includes(ipadGeneration)) setIpadGeneration("");
    if (proc && !ipadProcessorBase.includes(proc)) {
      setProc("");
      setTam("");
      setAlm("");
      return;
    }
    if (tam && !ipadSizeBase.includes(tam)) setTam("");
    if (alm && !ipadStorageBase.includes(alm)) setAlm("");
  }, [isIpad, gama, proc, tam, alm, ipadGeneration, ipadGenerationBase, ipadProcessorBase, ipadSizeBase, ipadStorageBase]);

  React.useEffect(() => {
    if (!isIphone) return;
    if ((!iphoneNumber || !iphoneModel) && title) {
      const parsed = parseIphoneFromTitle(title);
      if (!iphoneNumber && parsed.number) setIphoneNumber(parsed.number);
      if (!iphoneModel && parsed.model) setIphoneModel(parsed.model);
    }
    if (iphoneModel && !iphoneModelBase.includes(iphoneModel)) {
      setIphoneModel("");
      setIphoneStorage("");
      return;
    }
    if (iphoneStorage && !iphoneStorageBase.includes(iphoneStorage)) {
      setIphoneStorage("");
    }
  }, [isIphone, iphoneNumber, iphoneModel, iphoneStorage, iphoneModelBase, iphoneStorageBase, title]);

  React.useEffect(() => {
    if (!isIphone) return;
    if (includesValue && !iphoneIncludesOptions.includes(includesValue)) {
      setIncludesValue("");
      setIncludesExtra("");
    }
  }, [isIphone, includesValue, iphoneIncludesOptions]);

  const errors: string[] = [];
  const requiresBatteryInfo = saleType !== "PREVENTA" && productCondition !== "Nuevo";
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
    if (iphoneNumber && !IPHONE_NUMBER_OPTIONS.includes(iphoneNumber)) errors.push("El número de iPhone es inválido");
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
    if (watchType === "Normal") {
      if (!watchSeries) errors.push("Selecciona la serie");
      if (!watchConnection) errors.push("Selecciona la conexión");
    }
    if (watchType === "Ultra") {
      if (!watchVersion) errors.push("Selecciona la versión");
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
  if (productCondition !== "Nuevo" && hasWarranty && !warrantyDate.trim()) {
    errors.push("Ingresa la fecha de garantía");
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
      add("Accesorios", watchAccessories);
      add("Incluye Watch", watchIncludes);
    } else if (isOtros) {
      add("Descripcion", descriptionOther);
    }
    add("Color", color);
    add("Estado", productCondition);
    if (productCondition === "Nuevo") {
      lines.push("Bateria: Nueva");
    } else {
      add("Salud de bateria", salud ? `${salud}%` : "");
      add("Ciclos de carga", ciclos);
    }
    add("Incluye", includesValue === "Otros" ? includesExtra : includesValue);
    if (hasWarranty) add("Garantia", warrantyDate);
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
    try {
      const iphoneStorageGbParsed = parseIphoneStorageGb(iphoneStorage);
      const iphoneStorageValue = iphoneStorage ? String(iphoneStorage).trim().toUpperCase() : "";
      const iphoneStorageGb = Number.isFinite(iphoneStorageGbParsed) ? iphoneStorageGbParsed : null;
      const includesFlags = {
        caja: includesValue === "Caja + Cubo + Cable" || includesValue === "Caja + Cable" || includesValue === "Caja sola",
        cubo: includesValue === "Caja + Cubo + Cable" || includesValue === "Cubo + Cable",
        cable: includesValue === "Caja + Cubo + Cable" || includesValue === "Cubo + Cable" || includesValue === "Solo Cable" || includesValue === "Caja + Cable" || includesValue === "Cable solo",
      };
      const warrantyEnabled = productCondition === "Nuevo" ? true : hasWarranty;
      const warrantyValue = productCondition === "Nuevo"
        ? "1 año de garantía"
        : (hasWarranty ? warrantyDate.trim() : null);
      const almacenamientoVal = isIphone ? iphoneStorageValue : normalizeUnit(alm, "GB");
      const productDetailsValue = showProductDetails ? productDetails.trim() : "";
      const detailImageValues = showProductDetails ? uniqueStrings(detailImages) : [];
      const detalleNew = {
        ...(detalle || {}),
        gama,
        generacion: ipadGeneration,
        procesador: proc,
        ["tamaño"]: tam,
        tamanio: tam,
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
        incluye: includesFlags,
        includes: includesValue,
        includesExtra,
        productDetails: productDetailsValue || null,
        detalles: productDetailsValue || null,
        detailImages: detailImageValues,
        detailPhotos: null,
        preventaDateFrom: saleType === "PREVENTA" ? preventaDateFrom : null,
        preventaDateTo: saleType === "PREVENTA" ? preventaDateTo : null,
        preventa: saleType === "PREVENTA" ? { from: preventaDateFrom, to: preventaDateTo } : null,
        warrantyEnabled,
        warrantyDate: warrantyValue,
        garantiaActiva: warrantyEnabled,
        garantiaFecha: warrantyValue,
        garantia: warrantyValue,
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
        watchAccessories: watchAccessories || null,
        watchIncludes: watchIncludes || null,
        saleType,
        salePrice,
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
      if (saleType === "PREVENTA" && baseTitle && !/^preventa\\s+/i.test(baseTitle)) {
        baseTitle = `Preventa ${baseTitle}`;
      }
      const fixedTitle = capitalize(baseTitle.trim());
      let stagedId = String(item?.id || "").trim();
      if (!stagedId) {
        const created = await createManualPreventaDraft({
          saleType: saleType as SaleType,
          category,
          title: fixedTitle || "Preventa",
          stock: productCondition === "Nuevo" ? Number(stock || 1) : 1,
          price: Number(salePrice || 0),
        });
        const newId = String((created?.item as any)?.id || "").trim();
        if (!created?.ok || !newId) throw new Error("No se pudo crear el borrador de preventa");
        stagedId = newId;
      }
      await updateStaged(stagedId, {
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
        includes: includesValue,
        includesExtra,
        keyboardLayout,
        variantGroup: variantGroup.trim() || null,
        saleType,
        discount: saleType === "PROMOCION" ? discount : null,
        discountMode: saleType === "PROMOCION" ? discountMode : null,
        finalPrice: saleType === "PROMOCION" ? finalPrice : null,
        minOfferPrice: saleType === "OFERTA" ? minOfferPrice : null,
      });
      const mergeStagedIds = productCondition === "Nuevo" && Number(stock || 1) > 1
        ? selectedMergeIds
        : [];
      const mergeStagedSkus = productCondition === "Nuevo" && Number(stock || 1) > 1
        ? selectedMergeSkus
        : [];
      await publishStaged(stagedId, { slug: toSlug(fixedTitle), mergeStagedIds, mergeStagedSkus });
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
        includes: includesValue,
        includes_extra: includesExtra,
        keyboard_layout: keyboardLayout,
        variant_group: variantGroup.trim() || null,
        __mergeStagedIds: mergeStagedIds,
      });
    } catch (err) {
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
          <h3 className="text-xl sm:text-2xl font-semibold">Publicar producto</h3>
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
                    {MACBOOK_GAMA_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
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
                    {IPAD_GAMA_OPTIONS.map((g) => (<option key={g} value={g}>{g}</option>))}
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
                    {IPHONE_NUMBER_OPTIONS.map((n) => (<option key={n} value={n}>{n}</option>))}
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
                    <option value="Chip físico">Chip físico</option>
                    <option value="eSIM">eSIM</option>
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
                  <div>
                    <label className="block text-sm text-gray-700">Serie</label>
                    <select value={watchSeries} onChange={(e) => setWatchSeries(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                      <option value="">Seleccionar</option>
                      {["5","6","7","8","9","10","11"].map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                )}
                {watchType === "Normal" && (
                  <div>
                    <label className="block text-sm text-gray-700">Conexión</label>
                    <select value={watchConnection} onChange={(e) => setWatchConnection(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                      <option value="">Seleccionar</option>
                      <option value="GPS">GPS</option>
                      <option value="GPS + Cellular">GPS + Cellular</option>
                    </select>
                  </div>
                )}
                {watchType === "Ultra" && (
                  <div>
                    <label className="block text-sm text-gray-700">Versión</label>
                    <select value={watchVersion} onChange={(e) => setWatchVersion(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]">
                      <option value="">Seleccionar</option>
                      {["1","2","3"].map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-700">Accesorios (opcional)</label>
                  <input value={watchAccessories} onChange={(e) => setWatchAccessories(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Incluye (opcional)</label>
                  <input value={watchIncludes} onChange={(e) => setWatchIncludes(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700">Estado</label>
                <select
                  value={productCondition}
                  onChange={(e) => setProductCondition(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                >
                  <option value="">Seleccionar</option>
                  <option value="Nuevo">Nuevo</option>
                  <option value="Usado">Usado</option>
                  <option value="Open Box">Open Box</option>
                  <option value="Arreglado">Arreglado</option>
                </select>
              </div>
              {productCondition === "Nuevo" && (
                <div>
                  <label className="block text-sm text-gray-700">Stock</label>
                  <input
                    type="number"
                    min={1}
                    value={stock}
                    onChange={(e) => setStock(Math.max(1, Number(e.target.value || 1)))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  />
                </div>
              )}
              {productCondition === "Nuevo" && requiredMergeSkuCount > 0 && (
                <div className="col-span-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <div className="text-sm font-medium text-gray-800">SKU adicionales para este stock</div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {mergeSkuInputs.map((value, index) => (
                      <input
                        key={index}
                        value={value}
                        list={`merge-skus-${String(item?.id || "nuevo")}`}
                        onChange={(e) => {
                          const next = mergeSkuInputs.slice();
                          next[index] = e.target.value;
                          setMergeSkuInputs(next);
                        }}
                        className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                        placeholder={`SKU adicional ${index + 1}`}
                      />
                    ))}
                  </div>
                  <datalist id={`merge-skus-${String(item?.id || "nuevo")}`}>
                    {mergeCandidates.map((candidate) => (
                      <option key={candidate.id} value={candidate.sku}>
                        {candidate.title || candidate.sku}
                      </option>
                    ))}
                  </datalist>
                  {mergeCandidates.length > 0 && (
                    <p className="mt-2 text-xs text-gray-600">
                      Disponibles: {mergeCandidates.map((candidate) => candidate.sku).join(", ")}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700">¿Garantía?</label>
                <label className="inline-flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    checked={productCondition === "Nuevo" ? true : hasWarranty}
                    disabled={productCondition === "Nuevo"}
                    onChange={(e) => setHasWarranty(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-700">
                    {productCondition === "Nuevo" ? "1 año de garantía" : "Sí, tiene garantía"}
                  </span>
                </label>
              </div>
              {(productCondition === "Nuevo" || hasWarranty) && (
                <div>
                  <label className="block text-sm text-gray-700">Fecha de garantía</label>
                  <input
                    value={productCondition === "Nuevo" ? "1 año de garantía" : warrantyDate}
                    onChange={(e) => setWarrantyDate(e.target.value)}
                    readOnly={productCondition === "Nuevo"}
                    placeholder="19 de febrero del 2026"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff] read-only:bg-gray-100 read-only:text-gray-600"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm text-gray-700">Color</label>
                <input value={color} onChange={(e) => setColor(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]" placeholder="Midnight / Silver" />
              </div>
              {!isWatch && productCondition !== "Nuevo" && (
                <div>
                  <label className="block text-sm text-gray-700">Incluye</label>
                  <select
                    value={includesValue}
                    onChange={(e) => setIncludesValue(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                  >
                    <option value="">Seleccionar</option>
                    {isIphone ? (
                      <>
                        <option value="Caja + Cable">Caja + Cable</option>
                        <option value="Caja sola">Caja sola</option>
                        <option value="Cable solo">Cable solo</option>
                        <option value="Otros">Otros</option>
                        <option value="Ninguno">Ninguno</option>
                      </>
                    ) : (
                      <>
                        <option value="Caja + Cubo + Cable">Caja + Cubo + Cable</option>
                        <option value="Cubo + Cable">Cubo + Cable</option>
                        <option value="Solo Cable">Solo Cable</option>
                        <option value="Ninguno">Ninguno</option>
                        <option value="Otros">Otros</option>
                      </>
                    )}
                  </select>
                  {includesValue === "Otros" && (
                    <input
                      value={includesExtra}
                      onChange={(e) => setIncludesExtra(e.target.value)}
                      className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a84ff]"
                      placeholder="Especifica"
                    />
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



