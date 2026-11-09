export async function copyTextToClipboard(text: string) {
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

export async function fetchImageForZip(url: string, filenameBase: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo descargar ${filenameBase}`);
  const blob = await res.blob();
  const extension = getImageExtension(url, blob.type);
  const data = await blob.arrayBuffer();
  return { name: `${filenameBase}.${extension}`, data };
}

export function createZipBlob(files: { name: string; data: ArrayBuffer }[]) {
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

export function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

