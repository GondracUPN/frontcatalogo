"use client";
import React from "react";
import { formatStorageCompact, formatStorageDisplay } from "@/lib/storage";
import { buildAppleWatchTitle } from "@/lib/watch";
import { updateStaged, publishStaged } from "../../actions";
import {
  DEFAULT_PRODUCT_VERSION_CONFIG,
  normalizeProductVersionConfig,
  uniqueStrings as uniqueConfigStrings,
  type ProductVersionConfig,
} from "@/lib/product-version-config";

type DiscountMode = "percent" | "amount";

function includesAccessory(value: string, accessory: "Cubo" | "Cable") {
  return new RegExp(`\\b${accessory}\\b`, "i").test(String(value || ""));
}

function formatIncludesAccessories(value: string, cuboFake: boolean, cableFake: boolean) {
  let formatted = String(value || "");
  if (cuboFake && includesAccessory(formatted, "Cubo")) formatted = formatted.replace(/\bCubo\b/i, "Cubo Fake");
  if (cableFake && includesAccessory(formatted, "Cable")) formatted = formatted.replace(/\bCable\b/i, "Cable Fake");
  return formatted;
}

function toSlug(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferTipoFromTitle(title?: string) {
  const t = String(title || "").toLowerCase();
  if (/mac\s*book|macbook/.test(t)) return "MacBook";
  if (/\bipad\b/.test(t)) return "iPad";
  if (/\biphone\b/.test(t)) return "iPhone";
  if (/watch/.test(t)) return "Apple Watch";
  if (/airpods?/.test(t)) return "Accesorios";
  return "Otros";
}

function buildTitle(tipo: string, gama: string, proc: string, tam: string, iphoneModel?: string, ipadConnectivity?: string) {
  const isIphone = String(tipo || "").toLowerCase().includes("iphone");
  const isIpad = String(tipo || "").toLowerCase().includes("ipad");
  if (isIphone) return [tipo, proc, iphoneModel].filter(Boolean).join(" ").trim();
  if (isIpad) return [tipo, gama, proc, tam, ipadConnectivity].filter(Boolean).join(" ").trim();
  return [tipo, gama, proc, tam].filter(Boolean).join(" ").trim();
}

function buildIphoneTitle(number?: number | string | null, model?: string | null, storageGb?: number | string | null, color?: string | null) {
  const n = number ? String(number).trim() : "";
  const m = model ? String(model).trim() : "";
  const s = formatStorageCompact(storageGb);
  const c = color ? String(color).trim() : "";
  if (!n || !m || !s || !c) return "";
  const cap = c.charAt(0).toUpperCase() + c.slice(1);
  return `iPhone ${n} ${m} ${s} ${cap}`.trim();
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function uniqueStrings(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

function getAllMacbookScreenSizes(config: ProductVersionConfig) {
  return uniqueConfigStrings(
    Object.values(config.macbook.configByGamaProcessor)
      .flatMap((processors) => Object.values(processors))
      .flatMap((processor) => processor.sizes)
  );
}

function getAllIpadScreenSizes(config: ProductVersionConfig) {
  return uniqueConfigStrings(
    Object.values(config.ipad.sizesByGamaVersion)
      .flatMap((versions) => Object.values(versions))
      .flat()
  );
}

function toCategory(tipo: string) {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("mac")) return "macbook";
  if (t.includes("ipad")) return "ipad";
  if (t.includes("iphone")) return "iphone";
  if (t.includes("watch")) return "watch";
  if (t.includes("accesorios") || t.includes("airpods")) return "accesorios";
  return "otros";
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

export default function StagedPublishModal({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: (u: any) => void }) {
  const notes = React.useMemo(() => {
    try { return item?.notes && typeof item.notes === "string" ? JSON.parse(item.notes) : (item?.notes || {}); } catch { return {}; }
  }, [item]);
  const specs = (notes?.specs || notes) as any;
  const detalle = specs?.detalle || {};

  const legacySalePrice = Number(notes?.precioLista || 0);
  const legacyDiscount = Number(notes?.descuentoPorc || 0);

  const [title, setTitle] = React.useState(() => {
    const tipo = specs?.tipo || inferTipoFromTitle(item?.title);
    const gama = (detalle as any)?.gama || "";
    const proc = (detalle as any)?.procesador || "";
    const tam = (detalle as any)?.["tamaño"] || (detalle as any)?.tamanio || (detalle as any)?.tamano || "";
    const category = toCategory(tipo);
    if (category === "iphone") {
      const auto = buildIphoneTitle(item?.iphone_number ?? notes?.iphoneNumber, item?.iphone_model || notes?.iphoneModel, item?.storage_gb ?? notes?.storageGb ?? notes?.storage, item?.color || notes?.color || "");
      if (auto) return auto;
    }
    const connectivity = (detalle as any)?.conectividad || notes?.conectividad || "";
    const t = buildTitle(tipo, gama, proc, tam, item?.iphone_model || notes?.iphoneModel, connectivity);
    return t ? capitalize(t) : (item?.title || "");
  });
  const [titleManual, setTitleManual] = React.useState(false);
  // Nuevos campos para procesador, gama y tamaño de pantalla
  const [proc, setProc] = React.useState((detalle as any)?.procesador || "");
  const [gama, setGama] = React.useState((detalle as any)?.gama || "");
  const [tam, setTam] = React.useState((detalle as any)?.["tamaño"] || (detalle as any)?.tamanio || (detalle as any)?.tamano || "");
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

  const [ram, setRam] = React.useState(normalizeUnit(detalle?.ram || "", "GB"));
  const [alm, setAlm] = React.useState(normalizeUnit(detalle?.almacenamiento || "", "GB"));
  const [ipadConnectivity, setIpadConnectivity] = React.useState<string>(normalizeIpadConnectivity(detalle?.conectividad || notes?.conectividad || ""));
  const [keyboardLayout, setKeyboardLayout] = React.useState(() => {
    const raw = String(item?.keyboard_layout || detalle?.teclado || "");
    if (/espanol|español/i.test(raw)) return "Espanol";
    if (/ingles|inglés/i.test(raw)) return "Ingles";
    if (/otro/i.test(raw)) return "Otro";
    return raw;
  });
  const [ciclos, setCiclos] = React.useState(notes?.bateria?.ciclos || "");
  const [salud, setSalud] = React.useState(notes?.bateria?.salud || "");
  const [color, setColor] = React.useState(item?.color || notes?.color || "");
  const [productCondition, setProductCondition] = React.useState<string>(item?.product_condition || notes?.productCondition || notes?.estado || "");
  const [hasWarranty, setHasWarranty] = React.useState<boolean>(() => {
    if (productCondition === "Nuevo") return true;
    const raw = notes?.warrantyEnabled ?? notes?.garantiaActiva;
    if (raw === undefined || raw === null || raw === "") {
      return Boolean(String(notes?.warrantyDate ?? notes?.garantiaFecha ?? notes?.garantia ?? "").trim());
    }
    if (typeof raw === "boolean") return raw;
    return ["1", "true", "si", "sí", "yes", "on"].includes(String(raw).trim().toLowerCase());
  });
  const [warrantyDate, setWarrantyDate] = React.useState<string>(() => {
    if (productCondition === "Nuevo") return "1 año de garantía";
    return String(notes?.warrantyDate ?? notes?.garantiaFecha ?? notes?.garantia ?? "");
  });
  const [stock, setStock] = React.useState<number>(() => {
    const initial = Number(item?.stock ?? 1);
    return isFinite(initial) && initial > 0 ? initial : 1;
  });
  const [iphoneModel, setIphoneModel] = React.useState<string>(item?.iphone_model || notes?.iphoneModel || "");
  const [iphoneNumber, setIphoneNumber] = React.useState<string>(String(item?.iphone_number ?? notes?.iphoneNumber ?? ""));
  const [iphoneStorage, setIphoneStorage] = React.useState<string>(String(item?.storage_gb ?? notes?.storageGb ?? notes?.storage ?? ""));
  const [iphoneSimType, setIphoneSimType] = React.useState<string>(String(notes?.iphoneSimType || notes?.simType || notes?.chipType || detalle?.esim || detalle?.sim || ""));
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
  const [cuboFake, setCuboFake] = React.useState<boolean>(() => notes?.cuboFake === true || notes?.cuboFake === "true");
  const [cableFake, setCableFake] = React.useState<boolean>(() => notes?.cableFake === true || notes?.cableFake === "true");
  const [descriptionOther, setDescriptionOther] = React.useState<string>((detalle as any)?.descripcionOtro || notes?.descripcionOtro || "");
  const [productDetails, setProductDetails] = React.useState<string>(
    String((detalle as any)?.detalles || (detalle as any)?.productDetails || notes?.productDetails || notes?.detalles || "")
  );
  const [images, setImages] = React.useState<string[]>(Array.isArray(item?.images) ? item.images : []);
  const [detailImages, setDetailImages] = React.useState<string[]>(() => {
    const fromNotes = Array.isArray(notes?.detailImages) ? notes.detailImages : Array.isArray(notes?.detailPhotos) ? notes.detailPhotos : [];
    const fromDetail = Array.isArray((detalle as any)?.detailImages) ? (detalle as any).detailImages : [];
    return uniqueStrings([...fromNotes, ...fromDetail]);
  });
  const [showProductDetails, setShowProductDetails] = React.useState(() => Boolean(productDetails.trim() || detailImages.length));
  const [saleType, setSaleType] = React.useState<string>(() => {
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
  const detailUploadInFlightRef = React.useRef(false);
  const [versionConfig, setVersionConfig] = React.useState<ProductVersionConfig>(() => normalizeProductVersionConfig(DEFAULT_PRODUCT_VERSION_CONFIG));

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
    const tipo = specs?.tipo || inferTipoFromTitle(title || item?.title);
    const category = toCategory(tipo);
    if (titleManual) return;
    if (category === "iphone") {
      const auto = buildIphoneTitle(iphoneNumber, iphoneModel, iphoneStorage, color);
      if (auto) setTitle(auto);
      return;
    }
    if (category === "watch") {
      const auto = buildAppleWatchTitle({ type: watchType, series: watchSeries, version: watchVersion, size: tam, connection: watchConnection });
      if (auto) setTitle(auto);
      return;
    }
    if (category === "otros") {
      if (descriptionOther?.trim()) setTitle(capitalize(descriptionOther.trim()));
      return;
    }
    const auto = buildTitle(tipo, gama, proc, tam, iphoneModel, ipadConnectivity);
    const base = auto || title;
    if (base) {
      const withPrefix = saleType === "PREVENTA" && !/^preventa\s+/i.test(base) ? `Preventa ${base}` : base;
      setTitle(capitalize(withPrefix));
    }
  }, [gama, proc, tam, ipadConnectivity, titleManual, specs?.tipo, descriptionOther, iphoneModel, iphoneNumber, iphoneStorage, color, watchType, watchSeries, watchVersion, watchConnection, saleType, title, item?.title]);

  React.useEffect(() => {
    if (productCondition && productCondition !== "Nuevo") {
      setStock(1);
    } else if (productCondition === "Nuevo") {
      setHasWarranty(true);
      setWarrantyDate("1 año de garantía");
    }
  }, [productCondition]);

  React.useEffect(() => {
    if (productCondition !== "Nuevo" && !hasWarranty) setWarrantyDate("");
    if (productCondition !== "Nuevo" && warrantyDate === "1 año de garantía") setWarrantyDate("");
  }, [productCondition, hasWarranty, warrantyDate]);

  const tipoForLabel = specs?.tipo || inferTipoFromTitle(title || item?.title);
  const category = toCategory(tipoForLabel);
  const isMacbook = category === "macbook";
  const isIpad = category === "ipad";
  const isIphone = category === "iphone";
  const isWatch = category === "watch";
  const isOtros = category === "otros";
  const procLabel = "Procesador";
  const procPlaceholder = "M3 / M4";
  const iphoneNum = Number(iphoneNumber || 0);
  const stockNum = Number(stock || 0);
  const macbookScreenSizeOptions = React.useMemo(() => getAllMacbookScreenSizes(versionConfig), [versionConfig]);
  const ipadScreenSizeOptions = React.useMemo(() => getAllIpadScreenSizes(versionConfig), [versionConfig]);
  const iphoneModelOptions = React.useMemo(
    () => uniqueConfigStrings([
      "Normal",
      "Plus",
      "Pro",
      "Pro Max",
      "Mini",
      "SE",
      ...(versionConfig.iphone.modelsByNumber[iphoneNumber] || []),
      iphoneModel,
    ]),
    [iphoneModel, iphoneNumber, versionConfig]
  );

  const errors: string[] = [];
  const requiresBatteryInfo = saleType !== "PREVENTA" && productCondition !== "Nuevo";
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
      errors.push("El rango de llegada de la preventa es invalido");
    }
  }
  if (isMacbook) {
    if (!proc?.trim()) errors.push("El procesador es obligatorio");
    if (!ram?.trim()) errors.push("La RAM es obligatoria");
    if (!alm?.trim()) errors.push("El SSD es obligatorio");
    if (!tam?.trim()) errors.push("El tamaño de pantalla es obligatorio");
    if (tam && macbookScreenSizeOptions.length && !macbookScreenSizeOptions.includes(String(tam))) errors.push("Tamaño de pantalla inválido (MacBook)");
    if (requiresBatteryInfo && !ciclos) errors.push("Los ciclos de batería son obligatorios");
    if (requiresBatteryInfo && !salud) errors.push("La salud de batería es obligatoria");
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (!includesValue) errors.push("Selecciona que incluye");
  }
  if (isIpad) {
    if (!proc?.trim()) errors.push("El procesador es obligatorio");
    if (!gama?.trim()) errors.push("La gama es obligatoria");
    if (!tam?.trim()) errors.push("El tamaño de pantalla es obligatorio");
    if (tam && ipadScreenSizeOptions.length && !ipadScreenSizeOptions.includes(String(tam))) errors.push("Tamaño de pantalla inválido (iPad)");
    if (!alm?.trim()) errors.push("El almacenamiento es obligatorio");
    if (!ipadConnectivity?.trim()) errors.push("La conectividad es obligatoria");
    if (requiresBatteryInfo && !ciclos) errors.push("Los ciclos de batería son obligatorios");
    if (requiresBatteryInfo && !salud) errors.push("La salud de batería es obligatoria");
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (!includesValue) errors.push("Selecciona que incluye");
  }
  if (isIphone) {
    if (!iphoneModel) errors.push("Selecciona el modelo de iPhone");
    if (!iphoneNumber) errors.push("Selecciona el número de iPhone");
    if (iphoneNumber && !versionConfig.iphone.numbers.includes(iphoneNumber)) errors.push("El número de iPhone es inválido");
    if (!iphoneStorage) errors.push("El almacenamiento es obligatorio");
    if (!iphoneSimType) errors.push("Selecciona si el iPhone usa chip físico o eSIM");
    if (iphoneStorage && Number(iphoneStorage) <= 0) errors.push("El almacenamiento es inválido");
    if (requiresBatteryInfo && iphoneNum >= 15 && !ciclos) errors.push("Los ciclos de batería son obligatorios desde iPhone 15");
    if (requiresBatteryInfo && !salud) errors.push("La salud de batería es obligatoria");
    if (iphoneNumber && Number(iphoneNumber) <= 0) errors.push("El número de iPhone es inválido");
    if (salud && (Number(salud) < 1 || Number(salud) > 100)) errors.push("La salud de batería es inválida");
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (!includesValue) errors.push("Selecciona que incluye");
  }
  if (isWatch) {
    if (!watchType) errors.push("Selecciona el tipo de Watch");
    if (!watchConnection) errors.push("Selecciona la conexión");
    if (watchType === "Normal") {
      if (!watchSeries) errors.push("Selecciona la serie");
    }
    if (watchType === "Ultra") {
      if (!watchVersion) errors.push("Selecciona la versión");
    }
    if (!color?.trim()) errors.push("El color es obligatorio");
  }
  if (isOtros) {
    if (!descriptionOther?.trim()) errors.push("Describe el producto (Otros)");
    if (!includesValue) errors.push("Selecciona que incluye");
    if (!color?.trim()) errors.push("El color es obligatorio");
  }
  if (includesValue === "Otros" && !includesExtra?.trim()) errors.push("Describe lo que incluye");
  if (productCondition === "Nuevo" && stockNum < 1) {
    errors.push("El stock debe ser mayor o igual a 1");
  }
  if (productCondition && productCondition !== "Nuevo" && stockNum !== 1) {
    errors.push("El stock debe ser 1 para Usado/Open Box/Arreglado");
  }
  if (productCondition !== "Nuevo" && hasWarranty && !warrantyDate.trim()) {
    errors.push("Ingresa la fecha de garantía");
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
    } finally { setUploadingPhotos(false); }
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

  const getCurrentTitle = () => {
    const tipo = specs?.tipo || inferTipoFromTitle(title || item?.title);
    let baseTitle = title;
    if (!titleManual && category === "iphone") {
      const auto = buildIphoneTitle(iphoneNumber, iphoneModel, iphoneStorage, color);
      baseTitle = auto || title;
    } else if (!titleManual && category === "watch") {
      baseTitle = buildAppleWatchTitle({ type: watchType, series: watchSeries, version: watchVersion, size: tam, connection: watchConnection }) || title;
    } else if (!titleManual && isOtros) {
      baseTitle = descriptionOther.trim();
    } else if (!titleManual) {
      const autoTitle = buildTitle(tipo, gama, proc, tam, iphoneModel, ipadConnectivity);
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
    add("SKU", String(item?.sku || "").trim().replace(/^svc(?=[-_\s]*\d)/i, "MS"));
    add("Tipo", tipoForLabel);
    if (isMacbook) {
      add("Gama", gama);
      add("Procesador", proc);
      add("RAM", normalizeUnit(ram, "GB"));
      add("SSD", normalizeUnit(alm, "GB"));
      add("Pantalla", tam ? `${tam}"` : "");
      add("Teclado", keyboardLayout);
    } else if (isIpad) {
      add("Gama", gama);
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
    add("Incluye", includesValue === "Otros" ? includesExtra : formatIncludesAccessories(includesValue, cuboFake, cableFake));
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

  const onPublish = async () => {
    if (!canPublish) return;
    setSaving(true);
    setSubmitError("");
    try {
      const tipo = specs?.tipo || inferTipoFromTitle(title || item?.title);
      const includesFlags = {
        caja: includesValue === "Caja + Cubo + Cable",
        cubo: includesValue === "Caja + Cubo + Cable" || includesValue === "Cubo + Cable",
        cable: includesValue === "Caja + Cubo + Cable" || includesValue === "Cubo + Cable" || includesValue === "Solo Cable",
      };
      const almacenamientoVal = isIphone ? formatStorageDisplay(iphoneStorage) : normalizeUnit(alm, "GB");
      const productDetailsValue = showProductDetails ? productDetails.trim() : "";
      const detailImageValues = showProductDetails ? uniqueStrings(detailImages) : [];
      const detalleNew = {
        ...(detalle || {}),
        gama,
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
      const warrantyEnabled = productCondition === "Nuevo" ? true : hasWarranty;
      const warrantyValue = productCondition === "Nuevo"
        ? "1 año de garantía"
        : (hasWarranty ? warrantyDate.trim() : null);
      const newNotes = {
        ...(notes || {}),
        specs: { ...(specs || {}), tipo, estado: productCondition, detalle: detalleNew },
        bateria: { ciclos, salud },
        color,
        productCondition,
        incluye: includesFlags,
        includes: includesValue,
        includesExtra,
        cuboFake: includesAccessory(includesValue, "Cubo") && cuboFake,
        cableFake: includesAccessory(includesValue, "Cable") && cableFake,
        productDetails: productDetailsValue || null,
        detalles: productDetailsValue || null,
        detailImages: detailImageValues,
        detailPhotos: null,
        warrantyEnabled,
        warrantyDate: warrantyValue,
        garantiaActiva: warrantyEnabled,
        garantiaFecha: warrantyValue,
        garantia: warrantyValue,
        iphoneModel,
        iphoneNumber: iphoneNumber ? Number(iphoneNumber) : null,
        storageGb: iphoneStorage ? Number(iphoneStorage) : null,
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
        preventaDateFrom: saleType === "PREVENTA" ? preventaDateFrom : null,
        preventaDateTo: saleType === "PREVENTA" ? preventaDateTo : null,
        preventa: saleType === "PREVENTA" ? { from: preventaDateFrom, to: preventaDateTo } : null,
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
      } else if (!titleManual && category === "watch") {
        baseTitle = buildAppleWatchTitle({ type: watchType, series: watchSeries, version: watchVersion, size: tam, connection: watchConnection }) || title;
      } else if (!titleManual && isOtros) baseTitle = descriptionOther.trim();
      else if (!titleManual) {
        const autoTitle = buildTitle(tipo, gama, proc, tam, iphoneModel, ipadConnectivity);
        baseTitle = autoTitle || title;
      }
      if (saleType === "PREVENTA" && baseTitle && !/^preventa\s+/i.test(baseTitle)) {
        baseTitle = `Preventa ${baseTitle}`;
      }
      const fixedTitle = capitalize(baseTitle.trim());
      const updateResult = await updateStaged(item.id, {
        title: fixedTitle,
        price: String(salePrice),
        images,
        stock: productCondition === "Nuevo" ? Number(stock || 1) : 1,
        notes: JSON.stringify(newNotes),
        category,
        productCondition,
        iphoneModel,
        iphoneNumber: iphoneNumber ? Number(iphoneNumber) : null,
        storageGb: iphoneStorage ? Number(iphoneStorage) : null,
        batteryCycles: ciclos ? Number(ciclos) : null,
        batteryHealth: salud ? Number(salud) : null,
        color: color || null,
        includes: includesValue,
        includesExtra,
        keyboardLayout,
        saleType,
        discount: saleType === "PROMOCION" ? discount : null,
        discountMode: saleType === "PROMOCION" ? discountMode : null,
        finalPrice: saleType === "PROMOCION" ? finalPrice : null,
        minOfferPrice: saleType === "OFERTA" ? minOfferPrice : null,
      });
      if (!updateResult.ok) throw new Error(updateResult.error || "No se pudo guardar el producto");
      const publishResult = await publishStaged(item.id, { slug: toSlug(fixedTitle) });
      if (!publishResult.ok) throw new Error(publishResult.error || "No se pudo publicar el producto");
      onSaved({
        ...item,
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
        storage_gb: iphoneStorage ? Number(iphoneStorage) : null,
        battery_cycles: ciclos ? Number(ciclos) : null,
        battery_health: salud ? Number(salud) : null,
        color: color || null,
        product_condition: productCondition,
        category,
        includes: includesValue,
        includes_extra: includesExtra,
        keyboard_layout: keyboardLayout,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "No se pudo publicar el producto");
    } finally { setSaving(false); }
  };

  const mainPhotosPanel = (
    <div>
      <label className="block text-sm mb-1">Fotos</label>
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
        {images.map((u,i)=> (
          <div key={i} className={`overflow-hidden rounded-xl border bg-white ${i === 0 ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200"}`}>
            <div className="relative aspect-square bg-gray-50">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <div className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${i === 0 ? "bg-emerald-600 text-white" : "bg-white/90 text-gray-700"}`}>
                {i === 0 ? "Portada" : `Foto ${i + 1}`}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1">
              <button
                type="button"
                disabled={i === 0}
                className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 disabled:bg-emerald-100 disabled:text-emerald-700"
                onClick={() => setImages(arr => { const copy=arr.slice(); const [img]=copy.splice(i,1); copy.unshift(img); return copy; })}
              >
                {i === 0 ? "Actual" : "Portada"}
              </button>
              <button
                type="button"
                className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                onClick={() => setImages(arr => arr.filter((_,idx) => idx!==i))}
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
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-semibold">Publicar producto</h3>
          <button onClick={onClose} className="h-9 w-9 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700" aria-label="Cerrar">×</button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 px-4 sm:px-6 pb-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium">Titulo</label>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setTitleManual(true); }} className="w-full border rounded px-3 py-2" />
            {isOtros && <p className="text-xs text-gray-500">Se autogenera desde la descripcion hasta que lo edites manualmente.</p>}
            {isIphone && <p className="text-xs text-gray-500">Se autogenera con los datos del iPhone hasta que lo edites manualmente.</p>}

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
                  <label className="block text-sm">Detalles del producto</label>
                  <textarea
                    value={productDetails}
                    onChange={(e) => setProductDetails(e.target.value)}
                    rows={4}
                    className="w-full resize-y border rounded px-3 py-2"
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
                <label className="block text-sm">Descripcion (Otros)</label>
                <input value={descriptionOther} onChange={(e) => setDescriptionOther(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
            )}

            {isMacbook && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">{procLabel}</label>
                  <input value={proc} onChange={(e) => setProc(e.target.value)} className="w-full border rounded px-3 py-2" placeholder={procPlaceholder} />
                </div>
                <div>
                  <label className="block text-sm">Tamaño de pantalla</label>
                  <select value={tam} onChange={(e) => setTam(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    {macbookScreenSizeOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">RAM</label>
                  <input value={ram} onChange={(e) => setRam(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="8 GB / 16 GB" />
                </div>
                <div>
                  <label className="block text-sm">SSD</label>
                  <input value={alm} onChange={(e) => setAlm(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="256 GB / 512 GB / 1 TB" />
                </div>
                <div>
                  <label className="block text-sm">Teclado</label>
                  <select value={keyboardLayout} onChange={(e) => setKeyboardLayout(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    <option value="Ingles">Inglés</option>
                    <option value="Espanol">Español</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Ciclos de batería</label>
                  <input type="number" value={ciclos} onChange={(e) => setCiclos(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Salud (%)</label>
                  <input type="number" value={salud} onChange={(e) => setSalud(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
            )}

            {isIpad && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Procesador</label>
                  <input value={proc} onChange={(e) => setProc(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="M2 / M4" />
                </div>
                <div>
                  <label className="block text-sm">Gama</label>
                  <input value={gama} onChange={(e) => setGama(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Tamaño de pantalla</label>
                  <select value={tam} onChange={(e) => setTam(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    {ipadScreenSizeOptions.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Almacenamiento</label>
                  <input value={alm} onChange={(e) => setAlm(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="128 GB / 256 GB / 512 GB" />
                </div>
                <div>
                  <label className="block text-sm">Conectividad</label>
                  <select value={ipadConnectivity} onChange={(e) => setIpadConnectivity(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    <option value="WiFi">WiFi</option>
                    <option value="WiFi + Celular">WiFi + Celular</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Ciclos de batería</label>
                  <input type="number" value={ciclos} onChange={(e) => setCiclos(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Salud (%)</label>
                  <input type="number" value={salud} onChange={(e) => setSalud(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
            )}

            {isIphone && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Modelo iPhone</label>
                  <select value={iphoneModel} onChange={(e) => setIphoneModel(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    {iphoneModelOptions.map((model) => (<option key={model} value={model}>{model}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Número</label>
                  <select value={iphoneNumber} onChange={(e) => setIphoneNumber(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    {versionConfig.iphone.numbers.map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Almacenamiento (GB)</label>
                  <input type="number" value={iphoneStorage} onChange={(e) => setIphoneStorage(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">SIM</label>
                  <select value={iphoneSimType} onChange={(e) => setIphoneSimType(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    {versionConfig.iphone.simTypes.map((s) => (<option key={s} value={s}>{s}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Ciclos de batería (desde iPhone 15)</label>
                  <input type="number" value={ciclos} onChange={(e) => setCiclos(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Salud batería (%)</label>
                  <input type="number" value={salud} onChange={(e) => setSalud(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
            )}

            {isWatch && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm">Tipo Watch</label>
                  <select value={watchType} onChange={(e) => setWatchType(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    <option value="Normal">Normal</option>
                    <option value="Ultra">Ultra</option>
                  </select>
                </div>
                {watchType === "Normal" && (
                  <div>
                    <label className="block text-sm">Serie</label>
                    <select value={watchSeries} onChange={(e) => setWatchSeries(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                      <option value="">Seleccionar</option>
                      {versionConfig.watch.normalSeries.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm">Conexión</label>
                  <select value={watchConnection} onChange={(e) => setWatchConnection(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    <option value="GPS">GPS</option>
                    <option value="GPS + Cellular">GPS + Cellular</option>
                  </select>
                </div>
                {watchType === "Ultra" && (
                  <div>
                    <label className="block text-sm">Versión</label>
                    <select value={watchVersion} onChange={(e) => setWatchVersion(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                      <option value="">Seleccionar</option>
                      {versionConfig.watch.ultraVersions.map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm">Accesorios (opcional)</label>
                  <input value={watchAccessories} onChange={(e) => setWatchAccessories(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm">Incluye (opcional)</label>
                  <input value={watchIncludes} onChange={(e) => setWatchIncludes(e.target.value)} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Estado</label>
                <select value={productCondition} onChange={(e) => setProductCondition(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                  <option value="">Seleccionar</option>
                  <option value="Nuevo">Nuevo</option>
                  <option value="Usado">Usado</option>
                  <option value="Open Box">Open Box</option>
                  <option value="Arreglado">Arreglado</option>
                </select>
              </div>
              {productCondition === "Nuevo" && (
                <div>
                  <label className="block text-sm">Stock</label>
                  <input
                    type="number"
                    min={1}
                    value={stock}
                    onChange={(e) => setStock(Math.max(1, Number(e.target.value || 1)))}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm">Color</label>
                <input value={color} onChange={(e) => setColor(e.target.value)} className="w-full border rounded px-3 py-2" />
              </div>
              {!isWatch && (
                <div>
                  <label className="block text-sm">Incluye</label>
                  <select
                    value={includesValue}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setIncludesValue(nextValue);
                      if (!includesAccessory(nextValue, "Cubo")) setCuboFake(false);
                      if (!includesAccessory(nextValue, "Cable")) setCableFake(false);
                    }}
                    className="w-full border rounded px-3 py-2 bg-white"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Caja + Cubo + Cable">Caja + Cubo + Cable</option>
                    <option value="Cubo + Cable">Cubo + Cable</option>
                    <option value="Solo Cable">Solo Cable</option>
                    <option value="Ninguno">Ninguno</option>
                    <option value="Otros">Otros</option>
                  </select>
                  {(includesAccessory(includesValue, "Cubo") || includesAccessory(includesValue, "Cable")) && (
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                      {includesAccessory(includesValue, "Cubo") && (
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={cuboFake} onChange={(e) => setCuboFake(e.target.checked)} />
                          Cubo Fake
                        </label>
                      )}
                      {includesAccessory(includesValue, "Cable") && (
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={cableFake} onChange={(e) => setCableFake(e.target.checked)} />
                          Cable Fake
                        </label>
                      )}
                    </div>
                  )}
                  {includesValue === "Otros" && (
                    <input value={includesExtra} onChange={(e) => setIncludesExtra(e.target.value)} className="mt-2 w-full border rounded px-3 py-2" placeholder="Especifica" />
                  )}
                </div>
              )}
              <div className="col-span-2 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={productCondition === "Nuevo" ? true : hasWarranty}
                    disabled={productCondition === "Nuevo"}
                    onChange={(e) => setHasWarranty(e.target.checked)}
                  />
                  {productCondition === "Nuevo" ? "1 año de garantía" : "Sí, tiene garantía"}
                </label>
                {(productCondition === "Nuevo" || hasWarranty) && (
                  <div className="mt-3">
                    <label className="block text-sm text-gray-700">Fecha de garantía</label>
                    <input
                      value={productCondition === "Nuevo" ? "1 año de garantía" : warrantyDate}
                      onChange={(e) => setWarrantyDate(e.target.value)}
                      readOnly={productCondition === "Nuevo"}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Ej: 2026-12-31 o 6 meses"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm">Tipo de venta</label>
              <select value={saleType} onChange={(e) => setSaleType(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                <option value="PREVENTA">PREVENTA</option>
                <option value="VENTA_SIMPLE">VENTA_SIMPLE</option>
                <option value="PROMOCION">PROMOCION</option>
                <option value="OFERTA">OFERTA</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm">Precio de venta (S/)</label>
                <input type="number" value={salePrice} onChange={(e)=>setSalePrice(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
              </div>
              {saleType === "PROMOCION" && (
                <div className="space-y-2">
                  <label className="block text-sm">Descuento</label>
                  <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
                    <input type="number" value={discount} onChange={(e)=>setDiscount(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
                    <select value={discountMode} onChange={(e)=>setDiscountMode(e.target.value as DiscountMode)} className="w-full border rounded px-2 py-2 bg-white">
                      <option value="percent">%</option>
                      <option value="amount">S/</option>
                    </select>
                  </div>
                </div>
              )}
              {saleType === "OFERTA" && (
                <div>
                  <label className="block text-sm">Minimo de oferta (S/)</label>
                  <input type="number" value={minOfferPrice} onChange={(e)=>setMinOfferPrice(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
                </div>
              )}
            </div>

            {saleType === "PROMOCION" && finalPrice !== null && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                Precio promocional: <span className="text-lg font-semibold">S/ {Number(finalPrice || 0).toFixed(2)}</span>
                {salePrice>0 && (<span className="ml-2 line-through text-rose-400">S/ {Number(salePrice||0).toFixed(2)}</span>)}
                <span className="ml-2 text-xs font-semibold uppercase tracking-[0.16em]">
                  {discountMode === "amount" ? `Ahorra S/ ${Number(discount || 0).toFixed(2)}` : `${Number(discount || 0)}% OFF`}
                </span>
              </div>
            )}

            {saleType === "PREVENTA" && (
              <div className="grid grid-cols-2 gap-3 border border-amber-200 bg-amber-50/60 rounded-lg p-3">
                <div>
                  <label className="block text-sm text-gray-700">Llega entre (desde)</label>
                  <input
                    type="date"
                    value={preventaDateFrom}
                    onChange={(e) => setPreventaDateFrom(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Llega entre (hasta)</label>
                  <input
                    type="date"
                    value={preventaDateTo}
                    onChange={(e) => setPreventaDateTo(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            )}

            {errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">
                {errors.map((e) => (<div key={e}>• {e}</div>))}
              </div>
            )}
            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">
                {submitError}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button disabled={!canPublish} onClick={onPublish} className="px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50">{saving? 'Publicando...' : 'Publicar'}</button>
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








