"use client";

import { useEffect, useRef, useState, type DragEvent, type PointerEvent } from "react";

type Region = { x: number; y: number; w: number; h: number };

/** Sube la foto tal como se ve en el lienzo. Devuelve la URL (la misma si no cambió). */
export type ClientPhotoUpload = () => Promise<string>;

// La foto no se sube al elegirla: el padre recibe `onChange(upload)` y la sube
// al pulsar Guardar/Listo. Si se cancela, no se sube nada.
export default function SaleClientPhoto({ disabled = false, onChange }: { disabled?: boolean; onChange?: (upload: ClientPhotoUpload | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [ready, setReady] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [draft, setDraft] = useState<Region | null>(null);
  const [blur, setBlur] = useState(false);
  const [strength, setStrength] = useState(24);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  // Estado leído por `upload` en el momento de guardar (no al elegir la foto).
  const stateRef = useRef({ blur, regions, draft });
  stateRef.current = { blur, regions, draft };
  // Evita subir dos veces la misma foto si el guardado falla y se reintenta.
  const versionRef = useRef(0);
  const uploadedRef = useRef<{ version: number; url: string } | null>(null);
  const locked = disabled || busy;

  useEffect(() => { versionRef.current += 1; }, [ready, regions, blur, strength]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const source = imageRef.current;
    if (!canvas || !source || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (!blur) return;
    for (const region of [...regions, ...(draft ? [draft] : [])]) {
      if (region.w < 1 || region.h < 1) continue;
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(region.x + region.w / 2, region.y + region.h / 2, region.w / 2, region.h / 2, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.filter = `blur(${strength}px)`;
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }, [ready, regions, draft, blur, strength]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- `upload` lee todo por refs
  useEffect(() => { onChangeRef.current?.(ready ? upload : null); }, [ready]);
  useEffect(() => () => onChangeRef.current?.(null), []);

  // Una foto soltada fuera de la zona no debe abrirse en la pestaña (se perdería el formulario).
  useEffect(() => {
    const block = (event: globalThis.DragEvent) => { if (event.dataTransfer?.types.includes("Files")) event.preventDefault(); };
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => { window.removeEventListener("dragover", block); window.removeEventListener("drop", block); };
  }, []);

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height)),
    };
  }

  async function select(file?: File) {
    if (!file || locked) return;
    setError("");
    if (!file.type.startsWith("image/")) { setError("Selecciona una imagen."); return; }
    setBusy(true);
    setReady(false);
    const url = URL.createObjectURL(file);
    try {
      const source = new Image();
      source.src = url;
      await source.decode();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const scale = Math.min(1, 1600 / Math.max(source.naturalWidth, source.naturalHeight));
      canvas.width = Math.round(source.naturalWidth * scale);
      canvas.height = Math.round(source.naturalHeight * scale);
      imageRef.current = source;
      uploadedRef.current = null;
      setRegions([]);
      setDraft(null);
      setBlur(false);
      setReady(true);
    } catch { setError("No se pudo abrir la imagen. Prueba con JPG, PNG o WebP."); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }

  function clear() {
    setReady(false);
    imageRef.current = null;
    uploadedRef.current = null;
    setRegions([]);
    setDraft(null);
  }

  async function upload(): Promise<string> {
    const { blur: blurOn, regions: marked, draft: pending } = stateRef.current;
    if (pending) throw new Error("Termina de marcar el rostro antes de guardar.");
    if (blurOn && !marked.length) throw new Error("Marca el rostro a desenfocar o desactiva «Desenfocar rostro».");
    const version = versionRef.current;
    if (uploadedRef.current?.version === version) return uploadedRef.current.url;
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) throw new Error("No hay foto del cliente.");
    setBusy(true);
    setError("");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error("No se pudo preparar la foto.")), "image/jpeg", 0.92,
      ));
      const body = new FormData();
      body.set("file", blob, "cliente.jpg");
      const response = await fetch("/api/admin/clientes/upload", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "No se pudo subir la foto.");
      if (!result.url) throw new Error("La foto se subió sin una dirección válida.");
      uploadedRef.current = { version, url: String(result.url) };
      return String(result.url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo subir la foto.";
      setError(message);
      throw new Error(message);
    } finally { setBusy(false); }
  }

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!locked) void select(event.dataTransfer.files?.[0]);
  };
  const dropProps = {
    onDragOver: (event: DragEvent<HTMLElement>) => { event.preventDefault(); if (!locked) setDragging(true); },
    onDragLeave: () => setDragging(false),
    onDrop,
  };

  return (
    <fieldset disabled={disabled} className="my-4 space-y-3 rounded-xl border border-gray-200 p-3 text-sm">
      <legend className="px-1 font-medium text-gray-700">Foto del cliente (opcional)</legend>
      <input ref={inputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label="Elegir foto del cliente"
        onChange={(event) => { void select(event.target.files?.[0]); event.target.value = ""; }} />
      {!ready && (
        <button type="button" {...dropProps} onClick={() => inputRef.current?.click()} disabled={locked}
          className={`flex min-h-44 w-full flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 text-center transition ${dragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50"} disabled:opacity-60`}>
          <span className="font-semibold text-gray-800">{busy ? "Abriendo foto..." : "Arrastra la foto aquí"}</span>
          <span className="text-xs text-gray-500">o haz clic para elegirla</span>
        </button>
      )}
      {ready && <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={blur} onChange={(event) => setBlur(event.target.checked)} />Desenfocar rostro</label>
        {blur && <label className="flex items-center gap-2">Intensidad<input aria-label="Intensidad del desenfoque" type="range" min="12" max="70" value={strength} onChange={(event) => setStrength(Number(event.target.value))} /></label>}
        {blur && <button type="button" className="text-blue-700 underline" onClick={() => setRegions([])}>Borrar selección</button>}
        <span className="ml-auto flex gap-3">
          <button type="button" className="text-blue-700 underline" onClick={() => inputRef.current?.click()}>Cambiar foto</button>
          <button type="button" className="text-red-700 underline" onClick={clear}>Quitar</button>
        </span>
      </div>}
      {ready && blur && <p className="text-xs text-gray-600">Arrastra sobre el rostro para cubrirlo. Puedes marcar varios rostros.</p>}
      <div {...(ready ? dropProps : {})} className={ready && dragging ? "rounded-lg ring-2 ring-indigo-500" : ""}>
        <canvas ref={canvasRef} aria-label="Vista previa de la foto; arrastra para seleccionar el rostro" className={`${ready ? "block" : "hidden"} h-auto max-h-[45vh] w-full rounded-lg object-contain ${blur && !locked ? "touch-none cursor-crosshair" : ""}`}
          onPointerDown={(event) => {
            if (!blur || locked) return;
            startRef.current = point(event);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = startRef.current;
            if (!start || locked) return;
            const end = point(event);
            setDraft({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y) });
          }}
          onPointerUp={(event) => {
            const start = startRef.current;
            startRef.current = null;
            if (!start) return;
            const end = point(event);
            const region = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), w: Math.abs(end.x - start.x), h: Math.abs(end.y - start.y) };
            if (region.w >= 5 && region.h >= 5) setRegions((current) => [...current, region]);
            setDraft(null);
          }}
          onPointerCancel={() => { startRef.current = null; setDraft(null); }}
        />
      </div>
      {ready && <p className="text-xs text-gray-500">Se sube al guardar, tal como se ve aquí.</p>}
      {busy && ready && <p role="status" className="text-indigo-700">Subiendo foto...</p>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </fieldset>
  );
}
