"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

type Region = { x: number; y: number; w: number; h: number };

export default function SaleClientPhoto({ disabled = false }: { disabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [draft, setDraft] = useState<Region | null>(null);
  const [blur, setBlur] = useState(false);
  const [strength, setStrength] = useState(24);
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");
  const locked = disabled || busy || uploaded;

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

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height)),
    };
  }

  async function select(file?: File) {
    if (!file) return;
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
      setRegions([]);
      setDraft(null);
      setBlur(false);
      setReady(true);
    } catch { setError("No se pudo abrir la imagen. Prueba con JPG, PNG o WebP."); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }

  async function upload() {
    if (locked || !ready || (blur && !regions.length) || draft) return;
    setBusy(true);
    setError("");
    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("No se pudo preparar la foto.");
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (value) => value ? resolve(value) : reject(new Error("No se pudo preparar la foto.")), "image/jpeg", 0.92,
      ));
      const body = new FormData();
      body.set("file", blob, "cliente.jpg");
      const response = await fetch("/api/admin/clientes/upload", { method: "POST", body });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "No se pudo subir la foto.");
      setUploaded(true);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo subir la foto."); }
    finally { setBusy(false); }
  }

  return (
    <fieldset disabled={locked} className="my-4 space-y-3 rounded-xl border border-gray-200 p-3 text-sm">
      <legend className="px-1 font-medium text-gray-700">Foto del cliente (opcional)</legend>
      {!uploaded && <label className="block">Agregar foto
        <input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={(event) => { void select(event.target.files?.[0]); event.target.value = ""; }} />
      </label>}
      {ready && !uploaded && <>
        <label className="flex items-center gap-2"><input type="checkbox" checked={blur} onChange={(event) => setBlur(event.target.checked)} />Desenfocar rostro</label>
        {blur && <>
          <p className="text-xs text-gray-600">Arrastra sobre el rostro para cubrirlo. Puedes marcar varios rostros.</p>
          <label className="flex items-center gap-2">Intensidad<input aria-label="Intensidad del desenfoque" type="range" min="12" max="70" value={strength} onChange={(event) => setStrength(Number(event.target.value))} /></label>
          <button type="button" className="text-blue-700 underline" onClick={() => setRegions([])}>Borrar selección</button>
        </>}
      </>}
      <canvas ref={canvasRef} aria-label="Vista previa de la foto; arrastra para seleccionar el rostro" className={`${ready ? "block" : "hidden"} h-auto w-full rounded-lg ${blur && !locked ? "touch-none cursor-crosshair" : ""}`}
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
      {ready && !uploaded && <>
        <p className="text-xs text-gray-500">Revisa la foto antes de subirla. Se guardará en las fotos de Clientes tal como se ve aquí.</p>
        <div className="flex gap-3">
          <button type="button" disabled={locked || !!draft || (blur && !regions.length)} onClick={() => void upload()} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50">{busy ? "Subiendo..." : "Subir foto a clientes"}</button>
          <button type="button" onClick={() => { setReady(false); imageRef.current = null; setRegions([]); setDraft(null); }}>Quitar foto</button>
        </div>
      </>}
      {uploaded && <p role="status" className="text-green-700">Foto subida a Clientes.</p>}
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </fieldset>
  );
}
