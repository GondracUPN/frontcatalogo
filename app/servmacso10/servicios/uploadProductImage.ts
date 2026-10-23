"use client";

// Lado mayor máximo: coincide con el límite del visor de zoom (c_limit,w_2400).
const MAX_SIDE = 2400;
// Por debajo de este peso y tamaño la foto se envía tal cual.
const MAX_UNTOUCHED_BYTES = 2 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 3;

/**
 * Reduce la foto en el navegador antes de subirla. Las fotos de celular
 * (12 MP, 4–8 MB) tardaban en viajar y en recibir la marca de agua, y
 * podían superar el límite de Vercel (~4,5 MB). Si no se puede decodificar
 * (p. ej. HEIC en escritorio), se envía el original.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= MAX_SIDE && file.size <= MAX_UNTOUCHED_BYTES) return file;
    const scale = Math.min(1, MAX_SIDE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // PNG/WebP pueden traer transparencia: se conservan como WebP.
    const keepAlpha = file.type === "image/png" || file.type === "image/webp";
    const type = keepAlpha ? "image/webp" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9));
    if (!blob || blob.size >= file.size) return file;
    const base = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${base}.${keepAlpha ? "webp" : "jpg"}`, { type });
  } finally {
    bitmap.close();
  }
}

export async function uploadProductImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", await prepareImageForUpload(file));
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

/** Ejecuta `task` sobre cada elemento con concurrencia limitada y conserva el orden. */
export async function mapInOrder<T, R>(items: T[], task: (item: T) => Promise<R>, limit = UPLOAD_CONCURRENCY): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
