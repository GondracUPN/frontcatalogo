export function isAccessory(product: Record<string, any>) {
  // El catálogo público agrupa accesorios en «otros». El tipo de la ficha
  // preparada es el que eligió el usuario, y tiene prioridad sobre ese grupo.
  return String(product?.staged?.category || product?.category || product?.product?.category || '').trim().toLowerCase() === 'accesorios';
}

/** Código comercial; el identificador de sincronización se conserva para ventas y stock. */
export function accessorySku(product: Record<string, any>): string {
  const row = product?.staged || product;
  let notes: Record<string, any> = {};
  try { notes = typeof row?.notes === 'string' ? JSON.parse(row.notes) : row?.notes || {}; } catch {}
  const code = notes.accessoryCode ?? row.accessoryCode ?? row.codigoInventario;
  if (code !== undefined && code !== null && String(code).trim()) return `ACC-${String(code).replace(/^ACC[-_\s]*/i, '')}`;
  const sku = String(row?.sku || product?.product?.sku || '').trim();
  if (/^acc-(?:ref|lot)-/i.test(sku)) return /^acc-lot-(\d+)$/i.test(sku) ? `ACC-${sku.match(/\d+$/)?.[0]}` : 'ACC';
  return sku ? `ACC-${sku.replace(/^(?:PREV-)?(?:ACC|MS|SVC)[-_\s]*/i, '')}` : '';
}

export function accessoryState(product: Record<string, any>): string {
  const condition = product?.product_condition || product?.product?.product_condition || product?.staged?.product_condition;
  const presentation = product?.presentation || product?.product?.presentation || product?.staged?.presentation;
  if (condition === 'Nuevo' && presentation === 'sellado') return 'Sellado';
  return ['Usado', 'Open Box'].includes(condition) ? condition : '';
}

export type AccessoryPack = { units: number; price: number; label: string };

/** Datos públicos estrictos de una presentación. El stock siempre cuenta piezas. */
export function readAccessoryPack(value: unknown): AccessoryPack | null {
  const pack = value as Partial<AccessoryPack> | null;
  if (!pack || !Number.isSafeInteger(pack.units) || Number(pack.units) < 2 || Number(pack.units) > 1000000 || typeof pack.price !== 'number' || !Number.isFinite(pack.price) || Math.round(pack.price * 100) < 1 || pack.price > 9999999999.99) return null;
  if (typeof pack.label !== 'string' || !pack.label.trim() || pack.label.trim().length > 40) return null;
  return { units: Number(pack.units), price: Math.round(pack.price * 100) / 100, label: pack.label.trim() };
}

export function accessoryPackTotal(unitPrice: number, qty: number, pack: AccessoryPack | null): number {
  const count = Math.max(0, Math.floor(qty));
  const unitCents = Math.round(unitPrice * 100);
  if (!pack) return (unitCents * count) / 100;
  return (Math.floor(count / pack.units) * Math.round(pack.price * 100) + (count % pack.units) * unitCents) / 100;
}

export function getAccessoryPack(product: Record<string, any>): AccessoryPack | null {
  if (!isAccessory(product)) return null;
  try {
    const raw = product?.staged?.notes ?? product?.notes ?? {};
    const notes = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return readAccessoryPack(notes?.accessoryPack);
  } catch { return null; }
}
