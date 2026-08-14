export function normalizeWatchSize(value: unknown) {
  return String(value ?? "").match(/\b(40|41|42|44|45|46|49)\s*(?:mm)?\b/i)?.[1] || "";
}

export function buildAppleWatchTitle({
  type,
  series,
  version,
  size,
  connection,
}: {
  type?: unknown;
  series?: unknown;
  version?: unknown;
  size?: unknown;
  connection?: unknown;
}) {
  const watchType = String(type ?? "").trim();
  const isUltra = /ultra/i.test(watchType);
  const generation = String(isUltra ? version : series ?? "").replace(/^(?:series|ultra|se)\s*/i, "").trim();
  const normalizedSize = normalizeWatchSize(size);
  const rawConnection = String(connection ?? "").trim();
  const normalizedConnection = rawConnection
    ? (/cel/i.test(rawConnection) ? "GPS + Cellular" : (/gps/i.test(rawConnection) ? "GPS" : rawConnection))
    : "";

  if (!watchType && !generation && !normalizedSize) return "";
  const line = isUltra ? "Ultra" : "Series";
  return ["Apple Watch", line, generation, normalizedSize ? `${normalizedSize} mm` : "", normalizedConnection]
    .filter(Boolean)
    .join(" ");
}
