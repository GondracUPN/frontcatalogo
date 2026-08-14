function storageParts(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return null;

  const match = raw.match(/^(\d+(?:[.,]\d+)?)\s*(GB|TB)?$/i);
  if (!match) return { amount: raw, unit: "" };

  const amount = Number(match[1].replace(",", "."));
  const unit = (match[2] || "GB").toUpperCase();
  if (!Number.isFinite(amount)) return { amount: raw, unit: "" };

  if (unit === "GB" && amount >= 1024 && amount % 1024 === 0) {
    return { amount: String(amount / 1024), unit: "TB" };
  }
  return { amount: String(amount), unit };
}

export function formatStorageCompact(value: unknown) {
  const parsed = storageParts(value);
  if (!parsed) return "";
  return parsed.unit ? `${parsed.amount}${parsed.unit}` : parsed.amount;
}

export function formatStorageDisplay(value: unknown) {
  const parsed = storageParts(value);
  if (!parsed) return "";
  return parsed.unit ? `${parsed.amount} ${parsed.unit}` : parsed.amount;
}
