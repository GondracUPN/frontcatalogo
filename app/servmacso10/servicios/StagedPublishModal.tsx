"use client";
import React from "react";
import { updateStaged, publishStaged } from "../../actions";

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

function buildTitle(tipo: string, gama: string, proc: string, tam: string, iphoneModel?: string) {
  const isIphone = String(tipo || "").toLowerCase().includes("iphone");
  if (isIphone) return [tipo, proc, iphoneModel].filter(Boolean).join(" ").trim();
  return [tipo, gama, proc, tam].filter(Boolean).join(" ").trim();
}

function buildIphoneTitle(number?: number | string | null, model?: string | null, storageGb?: number | string | null, color?: string | null) {
  const n = number ? String(number).trim() : "";
  const m = model ? String(model).trim() : "";
  const s = storageGb ? String(storageGb).trim() : "";
  const c = color ? String(color).trim() : "";
  if (!n || !m || !s || !c) return "";
  const cap = c.charAt(0).toUpperCase() + c.slice(1);
  return `iPhone ${n} ${m} ${s}GB ${cap}`.trim();
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const SCREEN_SIZES = {
  macbook: ["13", "14", "15", "16"],
  ipad: ["10.2", "10.9", "11", "12.9"],
};

function toCategory(tipo: string) {
  const t = String(tipo || "").toLowerCase();
  if (t.includes("mac")) return "macbook";
  if (t.includes("ipad")) return "ipad";
  if (t.includes("iphone")) return "iphone";
  if (t.includes("watch")) return "watch";
  if (t.includes("accesorios") || t.includes("airpods")) return "accesorios";
  return "otros";
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const json = await res.json();
  if (!json?.ok) throw new Error(json?.message || "upload failed");
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
      const auto = buildIphoneTitle(item?.iphone_number ?? notes?.iphoneNumber, item?.iphone_model || notes?.iphoneModel, item?.storage_gb ?? notes?.storageGb ?? notes?.storage, notes?.color || "");
      if (auto) return auto;
    }
    const t = buildTitle(tipo, gama, proc, tam, item?.iphone_model || notes?.iphoneModel);
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
  const [color, setColor] = React.useState(notes?.color || "");
  const [productCondition, setProductCondition] = React.useState<string>(item?.product_condition || notes?.productCondition || notes?.estado || "");
  const [stock, setStock] = React.useState<number>(() => {
    const initial = Number(item?.stock ?? 1);
    return isFinite(initial) && initial > 0 ? initial : 1;
  });
  const [iphoneModel, setIphoneModel] = React.useState<string>(item?.iphone_model || notes?.iphoneModel || "");
  const [iphoneNumber, setIphoneNumber] = React.useState<string>(String(item?.iphone_number ?? notes?.iphoneNumber ?? ""));
  const [iphoneStorage, setIphoneStorage] = React.useState<string>(String(item?.storage_gb ?? notes?.storageGb ?? notes?.storage ?? ""));
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
  const [descriptionOther, setDescriptionOther] = React.useState<string>((detalle as any)?.descripcionOtro || notes?.descripcionOtro || "");
  const [images, setImages] = React.useState<string[]>(Array.isArray(item?.images) ? item.images : []);
  const [saleType, setSaleType] = React.useState<string>(() => {
    const st = String(item?.sale_type || notes?.saleType || "").toUpperCase();
    if (st) return st;
    if (legacyDiscount > 0) return "PROMOCION";
    return "VENTA_SIMPLE";
  });
  const [salePrice, setSalePrice] = React.useState<number>(() => {
    if (legacySalePrice > 0) return legacySalePrice;
    return Number(item?.price || 0);
  });
  const [discount, setDiscount] = React.useState<number>(Number(item?.discount || legacyDiscount || 0));
  const [minOfferPrice, setMinOfferPrice] = React.useState<number>(Number(item?.min_offer_price || 0));
  const finalPrice = React.useMemo(() => {
    if (saleType !== "PROMOCION") return null;
    const p = Number(salePrice || 0);
    const d = Number(discount || 0);
    return +(p * (1 - d / 100)).toFixed(2);
  }, [salePrice, discount, saleType]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const tipo = specs?.tipo || inferTipoFromTitle(title || item?.title);
    const category = toCategory(tipo);
    if (category === "iphone") {
      const auto = buildIphoneTitle(iphoneNumber, iphoneModel, iphoneStorage, color);
      if (auto) setTitle(auto);
      return;
    }
    if (titleManual) return;
    if (category === "otros") {
      if (descriptionOther?.trim()) setTitle(capitalize(descriptionOther.trim()));
      return;
    }
    const auto = buildTitle(tipo, gama, proc, tam, iphoneModel);
    const base = auto || title;
    if (base) {
      const withPrefix = saleType === "PREVENTA" && !/^preventa\s+/i.test(base) ? `Preventa ${base}` : base;
      setTitle(capitalize(withPrefix));
    }
  }, [gama, proc, tam, titleManual, specs?.tipo, descriptionOther, iphoneModel, iphoneNumber, iphoneStorage, color, saleType, title]);

  React.useEffect(() => {
    if (productCondition && productCondition !== "Nuevo") {
      setStock(1);
    }
  }, [productCondition]);

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

  const errors: string[] = [];
  if (!saleType) errors.push("Selecciona el tipo de venta");
  if (!salePrice || salePrice <= 0) errors.push("El precio de venta es obligatorio");
  if (!images.length) errors.push("Sube al menos una imagen");
  if (!productCondition) errors.push("Selecciona el estado del producto");
  if (saleType === "PROMOCION" && (!discount || discount <= 0)) errors.push("El descuento es obligatorio");
  if (saleType === "OFERTA" && (!minOfferPrice || minOfferPrice <= 0)) errors.push("El precio minimo de oferta es obligatorio");
  if (saleType === "OFERTA" && minOfferPrice && salePrice && Number(minOfferPrice) > Number(salePrice)) {
    errors.push("El minimo de oferta no puede ser mayor al precio de venta");
  }
  if (isMacbook) {
    if (!proc?.trim()) errors.push("El procesador es obligatorio");
    if (!ram?.trim()) errors.push("La RAM es obligatoria");
    if (!alm?.trim()) errors.push("El SSD es obligatorio");
    if (!tam?.trim()) errors.push("El tamaño de pantalla es obligatorio");
    if (tam && !SCREEN_SIZES.macbook.includes(String(tam))) errors.push("Tamaño de pantalla inválido (MacBook)");
    if (!ciclos) errors.push("Los ciclos de batería son obligatorios");
    if (!salud) errors.push("La salud de batería es obligatoria");
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (!includesValue) errors.push("Selecciona que incluye");
  }
  if (isIpad) {
    if (!proc?.trim()) errors.push("El procesador es obligatorio");
    if (!gama?.trim()) errors.push("La gama es obligatoria");
    if (!tam?.trim()) errors.push("El tamaño de pantalla es obligatorio");
    if (tam && !SCREEN_SIZES.ipad.includes(String(tam))) errors.push("Tamaño de pantalla inválido (iPad)");
    if (!alm?.trim()) errors.push("El almacenamiento es obligatorio");
    if (!ipadConnectivity?.trim()) errors.push("La conectividad es obligatoria");
    if (!ciclos) errors.push("Los ciclos de batería son obligatorios");
    if (!salud) errors.push("La salud de batería es obligatoria");
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (!includesValue) errors.push("Selecciona que incluye");
  }
  if (isIphone) {
    if (!iphoneModel) errors.push("Selecciona el modelo de iPhone");
    if (!iphoneNumber) errors.push("Selecciona el número de iPhone");
    if (iphoneNumber && ![14, 15, 16].includes(iphoneNum)) errors.push("El número de iPhone debe ser 14, 15 o 16");
    if (!iphoneStorage) errors.push("El almacenamiento es obligatorio");
    if (iphoneStorage && Number(iphoneStorage) <= 0) errors.push("El almacenamiento es inválido");
    if (iphoneNum >= 15 && !ciclos) errors.push("Los ciclos de batería son obligatorios desde iPhone 15");
    if (!salud) errors.push("La salud de batería es obligatoria");
    if (iphoneNumber && Number(iphoneNumber) <= 0) errors.push("El número de iPhone es inválido");
    if (salud && (Number(salud) < 1 || Number(salud) > 100)) errors.push("La salud de batería es inválida");
    if (!color?.trim()) errors.push("El color es obligatorio");
    if (!includesValue) errors.push("Selecciona que incluye");
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

  const canPublish = errors.length === 0 && !saving;

  const addFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setSaving(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadFile(f);
        urls.push(url);
      }
      setImages((arr) => [...arr, ...urls]);
    } finally { setSaving(false); }
  };

  const onPublish = async () => {
    if (!canPublish) return;
    setSaving(true);
    try {
      const tipo = specs?.tipo || inferTipoFromTitle(title || item?.title);
      const includesFlags = {
        caja: includesValue === "Caja + Cubo + Cable",
        cubo: includesValue === "Caja + Cubo + Cable" || includesValue === "Cubo + Cable",
        cable: includesValue === "Caja + Cubo + Cable" || includesValue === "Cubo + Cable" || includesValue === "Solo Cable",
      };
      const almacenamientoVal = isIphone ? (iphoneStorage ? `${iphoneStorage} GB` : "") : normalizeUnit(alm, "GB");
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
        descripcionOtro: descriptionOther,
      };
      const newNotes = {
        ...(notes || {}),
        specs: { ...(specs || {}), tipo, estado: productCondition, detalle: detalleNew },
        bateria: { ciclos, salud },
        color,
        productCondition,
        incluye: includesFlags,
        includes: includesValue,
        includesExtra,
        iphoneModel,
        iphoneNumber: iphoneNumber ? Number(iphoneNumber) : null,
        storageGb: iphoneStorage ? Number(iphoneStorage) : null,
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
        finalPrice: saleType === "PROMOCION" ? finalPrice : null,
        minOfferPrice: saleType === "OFERTA" ? minOfferPrice : null,
        detalle: detalleNew,
      };
      let baseTitle = title;
      if (category === "iphone") {
        const auto = buildIphoneTitle(iphoneNumber, iphoneModel, iphoneStorage, color);
        baseTitle = auto || title;
      } else if (isOtros) baseTitle = descriptionOther.trim();
      else {
        const autoTitle = buildTitle(tipo, gama, proc, tam, iphoneModel);
        baseTitle = autoTitle || title;
      }
      if (saleType === "PREVENTA" && baseTitle && !/^preventa\s+/i.test(baseTitle)) {
        baseTitle = `Preventa ${baseTitle}`;
      }
      const fixedTitle = capitalize(baseTitle.trim());
      await updateStaged(item.id, {
        title: fixedTitle,
        price: String(salePrice),
        images,
        stock: productCondition === "Nuevo" ? Number(stock || 1) : 1,
        notes: JSON.stringify(newNotes),
        category: item?.category,
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
        finalPrice: saleType === "PROMOCION" ? finalPrice : null,
        minOfferPrice: saleType === "OFERTA" ? minOfferPrice : null,
      });
      await publishStaged(item.id, { slug: toSlug(fixedTitle) });
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
        includes: includesValue,
        includes_extra: includesExtra,
        keyboard_layout: keyboardLayout,
      });
    } finally { setSaving(false); }
  };

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
            <input value={title} readOnly={isOtros || isIphone} onChange={(e) => { if (isOtros || isIphone) return; setTitle(e.target.value); setTitleManual(true); }} className="w-full border rounded px-3 py-2" />
            {isOtros && <p className="text-xs text-gray-500">El titulo se genera desde la descripcion.</p>}
            {isIphone && <p className="text-xs text-gray-500">El titulo se genera automaticamente para iPhone.</p>}

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
                    {SCREEN_SIZES.macbook.map((s) => (<option key={s} value={s}>{s}</option>))}
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
                    {SCREEN_SIZES.ipad.map((s) => (<option key={s} value={s}>{s}</option>))}
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
                    <option value="Normal">Normal</option>
                    <option value="Plus">Plus</option>
                    <option value="Pro">Pro</option>
                    <option value="Pro Max">Pro Max</option>
                    <option value="Mini">Mini</option>
                    <option value="SE">SE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Número</label>
                  <select value={iphoneNumber} onChange={(e) => setIphoneNumber(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    {["14","15","16"].map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm">Almacenamiento (GB)</label>
                  <input type="number" value={iphoneStorage} onChange={(e) => setIphoneStorage(e.target.value)} className="w-full border rounded px-3 py-2" />
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
                      {["5","6","7","8","9","10","11"].map((s) => (<option key={s} value={s}>{s}</option>))}
                    </select>
                  </div>
                )}
                {watchType === "Normal" && (
                  <div>
                    <label className="block text-sm">Conexión</label>
                    <select value={watchConnection} onChange={(e) => setWatchConnection(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                      <option value="">Seleccionar</option>
                      <option value="GPS">GPS</option>
                      <option value="GPS + Cellular">GPS + Cellular</option>
                    </select>
                  </div>
                )}
                {watchType === "Ultra" && (
                  <div>
                    <label className="block text-sm">Versión</label>
                    <select value={watchVersion} onChange={(e) => setWatchVersion(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                      <option value="">Seleccionar</option>
                      {["1","2","3"].map((s) => (<option key={s} value={s}>{s}</option>))}
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
                  <select value={includesValue} onChange={(e) => setIncludesValue(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                    <option value="">Seleccionar</option>
                    <option value="Caja + Cubo + Cable">Caja + Cubo + Cable</option>
                    <option value="Cubo + Cable">Cubo + Cable</option>
                    <option value="Solo Cable">Solo Cable</option>
                    <option value="Ninguno">Ninguno</option>
                    <option value="Otros">Otros</option>
                  </select>
                  {includesValue === "Otros" && (
                    <input value={includesExtra} onChange={(e) => setIncludesExtra(e.target.value)} className="mt-2 w-full border rounded px-3 py-2" placeholder="Especifica" />
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1">Fotos</label>
              <div className="flex gap-2 flex-wrap mb-2">
                {images.map((u,i)=> (
                  <div key={i} className="relative group">
                    <img src={u} alt="" className="w-20 h-20 object-cover rounded border" />
                    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button type="button" className="text-xs bg-white/80 border rounded px-1" onClick={() => setImages(arr => { if (i===0) return arr; const copy=arr.slice(); const [img]=copy.splice(i,1); copy.splice(i-1,0,img); return copy; })} aria-label="Mover a la izquierda">{"<"}</button>
                      <button type="button" className="text-xs bg-white/80 border rounded px-1" onClick={() => setImages(arr => { if (i===arr.length-1) return arr; const copy=arr.slice(); const [img]=copy.splice(i,1); copy.splice(i+1,0,img); return copy; })} aria-label="Mover a la derecha">{">"}</button>
                      <button type="button" className="text-xs bg-white/80 border rounded px-1" onClick={() => setImages(arr => arr.filter((_,idx) => idx!==i))} aria-label="Eliminar">X</button>
                    </div>
                  </div>
                ))}
              </div>
              <input type="file" multiple accept="image/jpeg,image/png,image/avif" onChange={(e)=>addFiles(e.target.files)} />
              <p className="text-xs text-gray-500 mt-1">Arriba puedes reordenar con las flechas; la primera foto se usa como principal.</p>
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
                <div>
                  <label className="block text-sm">Descuento (%)</label>
                  <input type="number" value={discount} onChange={(e)=>setDiscount(Number(e.target.value))} className="w-full border rounded px-3 py-2" />
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
              <div className="text-sm text-gray-700">Precio final: <span className="text-lg font-semibold">S/ {Number(finalPrice || 0).toFixed(2)}</span> {salePrice>0 && (<span className="ml-2 line-through text-gray-400">S/ {Number(salePrice||0).toFixed(2)}</span>)}</div>
            )}

            {errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">
                {errors.map((e) => (<div key={e}>• {e}</div>))}
              </div>
            )}

            <button disabled={!canPublish} onClick={onPublish} className="mt-4 px-4 py-2 rounded bg-emerald-600 text-white disabled:opacity-50">{saving? 'Publicando...' : 'Publicar'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}








