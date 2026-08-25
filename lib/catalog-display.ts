export function parseCatalogNotes(row: any) {
  try {
    return typeof row?.staged?.notes === "string"
      ? JSON.parse(row.staged.notes)
      : row?.staged?.notes || {};
  } catch {
    return {};
  }
}

export function uniqueText(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

export function catalogFacts(row: any) {
  const notes = parseCatalogNotes(row);
  const specs = notes?.specs || notes || {};
  const detail = specs?.detalle || notes?.detalle || {};
  const title = String(row?.product?.title || row?.staged?.title || row?.title || row?.slug || "Producto");
  const category = String(row?.category || row?.product?.category || row?.staged?.category || specs?.tipo || notes?.tipo || "");
  const processor = String(detail?.procesador || "").trim();
  const ram = String(detail?.ram || "").trim();
  const storage = String(detail?.almacenamiento || detail?.ssd || row?.product?.storage_gb || row?.staged?.storage_gb || notes?.storageGb || notes?.storage || "").trim();
  const batteryHealth = String(row?.product?.battery_health ?? row?.staged?.battery_health ?? notes?.batteryHealth ?? notes?.bateria?.salud ?? "").trim();
  const batteryCycles = String(row?.product?.battery_cycles ?? row?.staged?.battery_cycles ?? notes?.batteryCycles ?? notes?.bateria?.ciclos ?? "").trim();
  const sku = String(row?.product?.sku || row?.staged?.sku || notes?.manualSku || notes?.sourceSku || "").replace(/^MS(?:[-_\s]+)?/i, "").trim();
  const conditionDescription = String(detail?.detalles || detail?.productDetails || notes?.productDetails || notes?.detalles || "").trim();
  const detailImages = uniqueText([
    ...(Array.isArray(notes?.detailImages) ? notes.detailImages : []),
    ...(Array.isArray(notes?.detailPhotos) ? notes.detailPhotos : []),
    ...(Array.isArray(detail?.detailImages) ? detail.detailImages : []),
  ]);

  return {
    notes,
    specs,
    detail,
    title,
    category,
    processor,
    ram,
    storage,
    batteryHealth,
    batteryCycles,
    sku,
    conditionDescription,
    detailImages,
    hasConditionDetails: Boolean(conditionDescription || detailImages.length),
  };
}

export function detailCountLabel(imageCount: number, hasDescription = false) {
  if (imageCount === 1) return "1 detalle estético";
  if (imageCount > 1) return `${imageCount} detalles fotografiados`;
  return hasDescription ? "Estado estético informado" : "";
}

export function compactSpecs(facts: ReturnType<typeof catalogFacts>) {
  const primary = [facts.processor, facts.ram && `${facts.ram.replace(/\s*GB$/i, "")} GB`, facts.storage]
    .filter(Boolean)
    .join(" · ");
  const battery = [
    facts.batteryHealth && `Batería ${facts.batteryHealth.replace(/%$/, "")}%`,
    facts.batteryCycles && `${facts.batteryCycles} ${Number(facts.batteryCycles) === 1 ? "ciclo" : "ciclos"}`,
  ].filter(Boolean).join(" · ");
  return [primary, battery].filter(Boolean).slice(0, 2);
}
