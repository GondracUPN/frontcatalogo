export type MarketplaceData = {
  sku: string;
  titulo: string;
  precio: string;
  descripcion: string;
  etiquetas: string[];
  categoriaMarketplace: string;
  estadoMarketplace: string;
  images: string[];
};

export type MarketplaceProduct = Record<string, any>;

type ProductFacts = {
  sku: string;
  title: string;
  category: string;
  type: string;
  range: string;
  processor: string;
  generation: string;
  screen: string;
  ram: string;
  storage: string;
  connectivity: string;
  keyboard: string;
  color: string;
  condition: string;
  batteryHealth: string;
  batteryCycles: string;
  includes: string;
  includesExtra: string;
  details: string;
  warrantyEnabled: boolean;
  warranty: string;
  iphoneNumber: string;
  iphoneModel: string;
  simType: string;
  watchType: string;
  watchSeries: string;
  watchConnection: string;
  watchVersion: string;
};

const text = (...values: unknown[]) => values
  .map((value) => value === null || value === undefined ? "" : String(value).trim())
  .find(Boolean) || "";

function parseNotes(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, any>;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function storedBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  return /^(?:1|true|si|sí|yes)$/i.test(text(value));
}

function genericAccessoryFlag(...values: unknown[]) {
  return values.some((value) => storedBoolean(value) || /^(?:fake|gen[eé]rico)$/i.test(text(value)));
}

function numberOnly(value: unknown) {
  const match = text(value).replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match?.[0] || "";
}

function capacity(value: unknown, fallbackUnit = "GB") {
  const raw = text(value).toUpperCase().replace(/\s+/g, "");
  const match = raw.match(/(\d+(?:\.\d+)?)(TB|GB)?/);
  return match ? `${match[1]}${match[2] || fallbackUnit}` : "";
}

function screenSize(value: unknown) {
  const raw = numberOnly(value);
  if (raw === "13.6") return "13";
  if (raw === "15.3") return "15";
  return raw;
}

function productFacts(product: MarketplaceProduct): ProductFacts {
  const notes = parseNotes(product.notes);
  const specs = notes.specs || notes;
  const detail = specs.detalle || notes.detalle || {};
  const condition = text(product.product_condition, notes.productCondition, specs.estado, notes.estado);
  const warrantyObject = [notes.warranty, notes.garantiaDetalle]
    .find((value) => value && typeof value === "object") || {};
  const warranty = text(
    notes.warrantyDate,
    notes.garantiaFecha,
    warrantyObject.date,
    warrantyObject.fecha,
    warrantyObject.hasta,
    typeof notes.garantia === "string" ? notes.garantia : "",
  );
  const title = text(product.title, notes.title);
  const category = text(product.category, notes.category, specs.tipo, notes.tipo);
  const inferredType = /mac\s*book/i.test(`${category} ${title}`)
    ? "MacBook"
    : /iphone/i.test(`${category} ${title}`)
      ? "iPhone"
      : /ipad/i.test(`${category} ${title}`)
        ? "iPad"
        : /watch/i.test(`${category} ${title}`)
          ? "Apple Watch"
          : text(specs.tipo, category, title.split(" ")[0]);

  return {
    sku: text(product.sku, notes.manualSku, notes.sourceSku),
    title,
    category,
    type: inferredType,
    range: text(detail.gama, notes.gama),
    processor: text(detail.procesador, notes.procesador),
    generation: text(detail.generacion, notes.generacion, notes.ipadGeneration),
    screen: screenSize(text(detail["tamaño"], detail.tamanio, detail.tamano, notes.screenSize)),
    ram: capacity(text(detail.ram, notes.ram)),
    storage: capacity(text(detail.almacenamiento, product.storage_gb, notes.storageGb, notes.storage)),
    connectivity: text(detail.conectividad, notes.conectividad, notes.ipadConnectivity),
    keyboard: text(product.keyboard_layout, detail.teclado, notes.keyboardLayout),
    color: text(product.color, notes.color),
    condition,
    batteryHealth: numberOnly(text(product.battery_health, notes.batteryHealth, notes.bateria?.salud)),
    batteryCycles: numberOnly(text(product.battery_cycles, notes.batteryCycles, notes.bateria?.ciclos)),
    includes: text(product.includes, notes.includes, notes.watchIncludes, typeof notes.incluye === "string" ? notes.incluye : ""),
    includesExtra: text(product.includes_extra, notes.includesExtra),
    details: text(detail.detalles, detail.productDetails, notes.productDetails, notes.detalles),
    warrantyEnabled: storedBoolean(notes.warrantyEnabled ?? notes.garantiaActiva ?? warrantyObject.enabled ?? warrantyObject.activa) || Boolean(warranty),
    warranty,
    iphoneNumber: text(product.iphone_number, notes.iphoneNumber),
    iphoneModel: text(product.iphone_model, notes.iphoneModel),
    simType: text(notes.iphoneSimType, notes.simType, notes.chipType, detail.esim, detail.sim),
    watchType: text(notes.watchType, detail.watchType),
    watchSeries: text(notes.watchSeries, detail.watchSeries),
    watchConnection: text(notes.watchConnection, detail.watchConnection, detail.conexion),
    watchVersion: text(notes.watchVersion, detail.watchVersion),
  };
}

function isSealed(facts: ProductFacts) {
  return /^(?:nuevo|sellado)$/i.test(facts.condition);
}

function isOpenBox(facts: ProductFacts) {
  return /open\s*box/i.test(facts.condition);
}

function isMacBook(facts: ProductFacts) {
  return /mac\s*book/i.test(`${facts.type} ${facts.category} ${facts.title}`);
}

function isIpad(facts: ProductFacts) {
  return /ipad/i.test(`${facts.type} ${facts.category} ${facts.title}`);
}

function isIphone(facts: ProductFacts) {
  return /iphone/i.test(`${facts.type} ${facts.category} ${facts.title}`);
}

function isWatch(facts: ProductFacts) {
  return /(?:apple\s*)?watch/i.test(`${facts.type} ${facts.category} ${facts.title}`);
}

function isMacMini(facts: ProductFacts) {
  return /mac\s*mini/i.test(`${facts.type} ${facts.category} ${facts.title}`);
}

function isAirPods(facts: ProductFacts) {
  return /airpods?/i.test(`${facts.type} ${facts.category} ${facts.title}`);
}

function mainAccessories(facts: ProductFacts) {
  if (isMacBook(facts)) return ["caja", "cubo", "cable"];
  if (isIphone(facts)) return ["caja", "cable"];
  if (isIpad(facts)) return ["caja", "cubo", "cable"];
  if (isWatch(facts)) return ["caja", "cable", "correa"];
  if (isMacMini(facts)) return ["caja", "cable de poder"];
  if (isAirPods(facts)) {
    if (/airpods?\s*max/i.test(facts.title)) return ["caja"];
    const isThirdOrFourthGeneration = /airpods?\s*(?:3|4)(?:\b|ª|a\s*generaci[oó]n)/i.test(facts.title) && !/pro/i.test(facts.title);
    return isThirdOrFourthGeneration ? ["caja"] : ["caja", "eartips"];
  }
  return [];
}

function joinSpanish(values: string[]) {
  const clean = values.filter(Boolean);
  if (clean.length < 2) return clean[0] || "";
  return `${clean.slice(0, -1).join(", ")} y ${clean.at(-1)}`;
}

function sealedTitleParts(facts: ProductFacts) {
  if (!isSealed(facts)) return [];
  const sealedWord = isMacBook(facts) ? "Sellada" : "Sellado";
  return [sealedWord, facts.warrantyEnabled && facts.warranty ? facts.warranty : ""];
}

function warrantyText(facts: ProductFacts) {
  if (!facts.warrantyEnabled || !facts.warranty) return "No cuenta con garantía";
  if (/equipo\s+sin\s+activar/i.test(facts.warranty) && /1\s*año/i.test(facts.warranty)) {
    return "Equipo sin activar y cuenta con 1 año de garantía";
  }
  return facts.warranty;
}

export function generateMarketplacePrice(product: MarketplaceProduct) {
  const notes = parseNotes(product.notes);
  const candidates = [product.final_price, notes.finalPrice, product.price];
  const value = candidates
    .filter((candidate) => candidate !== null && candidate !== undefined && String(candidate).trim() !== "")
    .map(Number)
    .find((candidate) => Number.isFinite(candidate) && candidate > 0) ?? 0;
  return String(Math.trunc(value));
}

export function normalizeAccessories(product: MarketplaceProduct) {
  const facts = productFacts(product);
  const notes = parseNotes(product.notes);
  const raw = `${facts.includes} ${facts.includesExtra}`.trim();
  const flagObject = notes.incluye;
  const available = mainAccessories(facts);
  const generic = {
    cubo: !isSealed(facts) && (
      genericAccessoryFlag(product.cuboFake, notes.cuboFake, notes.accessories?.cuboFake, notes.accesorios?.cuboFake, flagObject?.cuboFake)
      || /\b(?:cubo|cargador)\s+(?:fake|gen[eé]rico)\b|\b(?:fake|gen[eé]rico)\s+(?:cubo|cargador)\b/i.test(raw)
    ),
    cable: !isSealed(facts) && (
      genericAccessoryFlag(product.cableFake, notes.cableFake, notes.accessories?.cableFake, notes.accesorios?.cableFake, flagObject?.cableFake)
      || /\bcable\s+(?:fake|gen[eé]rico)\b|\b(?:fake|gen[eé]rico)\s+cable\b/i.test(raw)
    ),
  };
  if (isSealed(facts)) return { included: available, missing: [] as string[], extra: "", generic };
  const has = (name: string) => {
    if (["caja", "cubo", "cable"].includes(name) && flagObject && typeof flagObject === "object" && typeof flagObject[name] === "boolean") {
      return flagObject[name];
    }
    if (name === "cable de poder" && flagObject && typeof flagObject === "object" && typeof flagObject.cable === "boolean") {
      return flagObject.cable;
    }
    const patterns: Record<string, RegExp> = {
      caja: /\bcaja\b/i,
      cubo: /\b(?:cubo|cargador)\b/i,
      cable: /\bcable\b/i,
      correa: /\bcorrea\b/i,
      "cable de poder": /\bcable(?:\s+de\s+(?:poder|corriente))?\b/i,
      eartips: /\b(?:eartips?|ear\s*tips?|puntas?|almohadillas?)\b/i,
    };
    return Boolean(patterns[name]?.test(raw));
  };
  const included = available.filter(has);
  if (/\bningun|\bno incluye/i.test(raw)) included.splice(0);
  const missing = available.filter((item) => !included.includes(item));
  const extra = /otros/i.test(facts.includes) ? facts.includesExtra : "";
  return { included, missing, extra, generic };
}

export function normalizeProductDetails(value: unknown) {
  const original = text(value).replace(/\s+/g, " ").trim();
  if (!original) return "";
  let result = original
    .replace(/abolladura en la parte de la esquina abajo/gi, "abolladura en la esquina de la parte inferior")
    .replace(/,?\s*no afecta nada/gi, " que no afecta el funcionamiento")
    .replace(/abolladura en la tapa muy ligera/gi, "abolladura muy ligera en la tapa")
    .replace(/\s+,/g, ",")
    .replace(/,{2,}/g, ",");
  result = result.charAt(0).toUpperCase() + result.slice(1);
  return result.replace(/[.\s]+$/, "");
}

function aestheticState(facts: ProductFacts) {
  if (facts.details) return normalizeProductDetails(facts.details);
  if (isSealed(facts)) return "Producto sellado";
  if (isOpenBox(facts)) return "Open Box, sin detalles";
  return "Excelente estado general";
}

export function generateMarketplaceTitle(product: MarketplaceProduct) {
  const facts = productFacts(product);
  let parts: string[];
  if (isMacBook(facts)) {
    parts = ["Remato MacBook", facts.range, facts.processor, facts.screen ? `${facts.screen}”` : "", facts.ram ? `${facts.ram} RAM` : "", facts.storage ? `${facts.storage} SSD` : ""];
  } else if (isIpad(facts)) {
    parts = ["Remato iPad", facts.range, facts.processor || facts.generation, facts.screen ? `${facts.screen}”` : "", facts.storage, facts.connectivity];
  } else if (isIphone(facts)) {
    const model = [facts.iphoneNumber, facts.iphoneModel].filter(Boolean).join(" ");
    parts = ["Remato iPhone", model, facts.storage, facts.color];
  } else if (isWatch(facts)) {
    const watchModel = facts.watchType
      ? [facts.watchType, facts.watchSeries].filter(Boolean).join(" ")
      : facts.watchSeries ? `Series ${facts.watchSeries}` : facts.watchVersion;
    const size = facts.screen ? `${facts.screen}mm` : "";
    parts = ["Remato Apple Watch", watchModel, size, facts.watchConnection];
  } else {
    const existing = facts.title.replace(/^remato\s+/i, "").trim();
    parts = ["Remato", existing || facts.type];
  }
  if (isSealed(facts)) parts.push(...sealedTitleParts(facts));
  else {
    if (isOpenBox(facts)) parts.push("Open Box");
    if (facts.batteryHealth && (isMacBook(facts) || isIpad(facts) || isIphone(facts))) parts.push(`${facts.batteryHealth}% Batería`);
  }
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function introLine(facts: ProductFacts) {
  if (isMacBook(facts)) {
    const keyboard = /^ingles$/i.test(facts.keyboard) ? "inglés" : /^espanol$/i.test(facts.keyboard) ? "español" : facts.keyboard.toLowerCase();
    const memory = [facts.ram ? `${facts.ram} RAM` : "", facts.storage ? `${facts.storage} SSD` : ""].filter(Boolean).join(" y ");
    return [
      `MacBook${facts.range ? ` ${facts.range}` : ""}${facts.processor ? ` ${facts.processor}` : ""}${facts.screen ? ` de ${facts.screen} pulgadas` : ""}`,
      memory,
      facts.keyboard ? `teclado en ${keyboard}` : "",
      facts.color ? `color ${facts.color}` : "",
    ].filter(Boolean).join(", ") + ".";
  }
  if (isIpad(facts)) {
    return [
      `iPad${facts.range ? ` ${facts.range}` : ""}${facts.processor || facts.generation ? ` ${facts.processor || facts.generation}` : ""}${facts.screen ? ` de ${facts.screen} pulgadas` : ""}`,
      facts.connectivity,
      facts.storage,
      facts.color ? `color ${facts.color}` : "",
    ].filter(Boolean).join(", ") + ".";
  }
  if (isIphone(facts)) {
    const model = ["iPhone", facts.iphoneNumber, facts.iphoneModel].filter(Boolean).join(" ");
    const esim = /esim|virtual/i.test(facts.simType) ? "chip virtual(Esim)" : "";
    return [model, [facts.storage, esim].filter(Boolean).join(" "), facts.color ? `color ${facts.color}` : ""].filter(Boolean).join(", ") + ".";
  }
  if (isWatch(facts)) {
    return [facts.title || generateMarketplaceTitle({ ...facts, notes: {} }).replace(/^Remato\s+/, ""), facts.watchConnection, facts.color ? `color ${facts.color}` : ""].filter(Boolean).join(", ") + ".";
  }
  return `${facts.title || facts.type}${facts.color ? `, color ${facts.color}` : ""}.`;
}

function accessoryLines(product: MarketplaceProduct, facts: ProductFacts) {
  const expectedAccessories = mainAccessories(facts);
  if (!expectedAccessories.length) {
    const raw = facts.includes === "Otros" ? facts.includesExtra : facts.includes;
    return raw ? [`Accesorios: Incluye ${raw}`] : [];
  }
  const accessories = normalizeAccessories(product);
  const included = [
    ...accessories.included.map((accessory) => {
      if (accessory === "cubo" && accessories.generic.cubo) return "cubo genérico";
      if (accessory === "cable" && accessories.generic.cable) return "cable genérico";
      if (accessory === "cable de poder" && accessories.generic.cable) return "cable de poder genérico";
      return accessory;
    }),
    accessories.extra,
  ].filter(Boolean);
  const lines = [included.length ? `Accesorios: Incluye ${joinSpanish(included)}` : "Accesorios: No incluye"];
  if (accessories.missing.length) lines.push(`No incluye: ${accessories.missing.join(", ")}`);
  return lines;
}

function iphoneExtraLines(product: MarketplaceProduct, facts: ProductFacts) {
  if (!isIphone(facts) || isSealed(facts)) return [];
  const missing = normalizeAccessories(product).missing;
  const lines: string[] = [];
  if (missing.includes("cubo")) lines.push("+70 soles Cubo sellado");
  if (missing.includes("cable")) lines.push("+70 soles Cable sellado");
  if (missing.includes("cubo") && missing.includes("cable")) lines.push("Cubo + Cable sellados por 130");
  return lines;
}

export function generateMarketplaceDescription(product: MarketplaceProduct) {
  const facts = productFacts(product);
  const battery = !isSealed(facts) && facts.batteryHealth
    ? `Batería: ${facts.batteryCycles ? `${facts.batteryCycles} ciclos | ` : ""}${facts.batteryHealth}% de salud`
    : "";
  const warranty = warrantyText(facts);
  const operative = /airpods/i.test(`${facts.type} ${facts.title}`) ? "100% operativos💯✅" : "100% operativa💯✅";
  const detailLines = [
    ...accessoryLines(product, facts),
    battery,
    `Garantía: ${warranty}`,
    ...iphoneExtraLines(product, facts),
  ].filter(Boolean);
  const closingLines = [
    operative,
    `Estado estético: ${aestheticState(facts)}`,
    "Se entrega boleta de compra USA",
    "Producto sin igv , si requiere boleta o factura + 18% igv al precio final acordado",
    "Aceptamos pagos con tarjeta de crédito +3.5% 💳",
    "🔸 Contraentrega en Centros Comerciales o en mi Almacén 🔸",
    "🛑 No Mercado Pago 🛑",
  ];
  return [
    introLine(facts),
    "",
    ...detailLines,
    "",
    ...closingLines,
  ].join("\n").trim();
}

function exactlyFifteen(candidates: Array<string | false | undefined>) {
  const result: string[] = [];
  for (const candidate of candidates) {
    const value = typeof candidate === "string" ? candidate.trim() : "";
    if (value && !result.some((current) => current.toLowerCase() === value.toLowerCase())) result.push(value);
    if (result.length === 15) break;
  }
  const safeFallbacks = ["Tecnología", "Electrónica", "Producto tecnológico", "Equipo tecnológico", "Dispositivo electrónico", "Tecnología premium"];
  for (const fallback of safeFallbacks) {
    if (result.length === 15) break;
    if (!result.some((current) => current.toLowerCase() === fallback.toLowerCase())) result.push(fallback);
  }
  return result;
}

export function generateMarketplaceTags(product: MarketplaceProduct) {
  const facts = productFacts(product);
  const storage = facts.storage;
  const screen = facts.screen;
  if (isMacBook(facts)) return exactlyFifteen([
    "Apple", "MacBook", facts.range && `MacBook ${facts.range}`, facts.range && facts.processor && `MacBook ${facts.range} ${facts.processor}`,
    facts.range && facts.processor && screen && `MacBook ${facts.range} ${facts.processor} ${screen}`, facts.range && screen && `MacBook ${facts.range} ${screen}`,
    facts.processor && `MacBook ${facts.processor}`, storage && `MacBook ${storage}`, facts.color && `MacBook ${facts.color}`, "Laptop Apple", "Laptop MacBook",
    "Apple MacBook", "Computadora Apple", facts.keyboard && `MacBook ${facts.keyboard}`, screen && `MacBook ${screen} Pulgadas`, "Laptop", "Notebook Apple",
  ]);
  if (isIpad(facts)) return exactlyFifteen([
    "Apple", "iPad", facts.range && `iPad ${facts.range}`, facts.processor && `iPad ${facts.processor}`, facts.generation && `iPad ${facts.generation}`,
    facts.range && facts.processor && `iPad ${facts.range} ${facts.processor}`, screen && `iPad ${screen} Pulgadas`, storage && `iPad ${storage}`,
    facts.connectivity && `iPad ${facts.connectivity}`, facts.color && `iPad ${facts.color}`, "Tablet Apple", "Tablet iPad", "Apple iPad", "iPad WiFi",
    "Computadora Apple", "Tablet", "Tecnología Apple",
  ]);
  if (isIphone(facts)) {
    const model = [facts.iphoneNumber, facts.iphoneModel].filter(Boolean).join(" ");
    return exactlyFifteen([
      "Apple", "iPhone", model && `iPhone ${model}`, facts.iphoneNumber && `iPhone ${facts.iphoneNumber}`, facts.iphoneModel && `iPhone ${facts.iphoneModel}`,
      storage && `iPhone ${storage}`, facts.color && `iPhone ${facts.color}`, model && storage && `iPhone ${model} ${storage}`, "Apple iPhone", "Celular Apple",
      "Smartphone Apple", "Teléfono Apple", "Celular iPhone", "Smartphone iPhone", "Equipo Apple", "Tecnología Apple", "iOS",
    ]);
  }
  if (isWatch(facts)) return exactlyFifteen([
    "Apple", "Apple Watch", facts.watchType && `Apple Watch ${facts.watchType}`, facts.watchSeries && `Apple Watch Series ${facts.watchSeries}`,
    facts.screen && `Apple Watch ${facts.screen}mm`, facts.watchConnection && `Apple Watch ${facts.watchConnection}`, facts.color && `Apple Watch ${facts.color}`,
    "Smartwatch Apple", "Reloj Apple", "Reloj inteligente", "Apple Smartwatch", "Watch Apple", facts.title, "Tecnología Apple", "Accesorio Apple", "Smartwatch", "Reloj digital",
  ]);
  return exactlyFifteen([
    "Apple", facts.type, facts.title, facts.color, `${facts.type} Apple`, `Apple ${facts.type}`, "Tecnología", "Electrónica", "Producto tecnológico",
    "Tecnología Apple", "Accesorio tecnológico", "Equipo tecnológico", "Producto Apple", "Electrónica Apple", "Dispositivo inteligente",
  ]);
}

export function generateMarketplaceData(product: MarketplaceProduct): MarketplaceData {
  const facts = productFacts(product);
  return {
    sku: facts.sku,
    titulo: generateMarketplaceTitle(product),
    precio: generateMarketplacePrice(product),
    descripcion: generateMarketplaceDescription(product),
    etiquetas: generateMarketplaceTags(product),
    categoriaMarketplace: "Electrónica e informática",
    estadoMarketplace: isSealed(facts) ? "Nuevo" : "Usado: como nuevo",
    images: Array.from(new Set((Array.isArray(product.images) ? product.images : []).map((url) => String(url || "").trim()).filter(Boolean))),
  };
}

export const MARKETPLACE_STORAGE_KEY = "macsomenos.marketplace.prepared.v1";
export const MARKETPLACE_EVENT_NAME = "marketplace-helper:prepared";

export function sendToMarketplaceHelper(marketplaceData: MarketplaceData) {
  const payload = { version: 1, preparedAt: new Date().toISOString(), data: marketplaceData };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(MARKETPLACE_EVENT_NAME, { detail: payload }));
    window.postMessage({ source: "macsomenos-marketplace-helper", type: "MARKETPLACE_PRODUCT_PREPARED", payload }, window.location.origin);
  }
  return payload;
}
