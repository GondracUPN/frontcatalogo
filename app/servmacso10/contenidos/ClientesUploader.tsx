"use client";

import { useEffect, useRef, useState } from "react";

type UploadState = "idle" | "uploading" | "error";

export default function ClientesUploader() {
  const [state, setState] = useState<UploadState>("idle");
  const [urls, setUrls] = useState<string[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const loadList = async () => {
    try {
      const res = await fetch("/api/admin/clientes/list", { cache: "no-store" });
      const json = await res.json();
      if (!json?.ok || !Array.isArray(json.urls)) throw new Error("list failed");
      setUrls(json.urls);
    } catch {
      setUrls([]);
      setState("error");
    }
  };

  useEffect(() => {
    void loadList();
  }, []);

  useEffect(() => {
    if (!selectedUrl) return;
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedUrl(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeWithEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeWithEscape);
    };
  }, [selectedUrl]);

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/clientes/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!json?.ok) throw new Error("upload failed");
  };

  const onFiles = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) {
      setState("error");
      return;
    }
    setState("uploading");
    try {
      for (const file of imageFiles) await uploadFile(file);
      await loadList();
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const deleteFile = async (url: string) => {
    if (!confirm("¿Eliminar esta foto de cliente?")) return;
    setDeletingUrl(url);
    try {
      const res = await fetch("/api/admin/clientes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error("delete failed");
      setUrls((current) => current.filter((item) => item !== url));
      setSelectedUrl(null);
      setState("idle");
    } catch {
      setState("error");
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Galería de clientes</p>
          <p className="text-xs text-gray-500">{urls.length} foto{urls.length === 1 ? "" : "s"} · Haz clic en una miniatura para ampliarla.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-[#0071e3] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a84ff]">
          {state === "uploading" ? "Subiendo..." : "Agregar imágenes"}
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={state === "uploading"}
            onChange={(event) => {
              const files = event.target.files;
              void onFiles(files);
              event.target.value = "";
            }}
            className="sr-only"
          />
        </label>
      </div>

      {state === "error" && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">No se pudo completar la operación. Intenta nuevamente.</div>}

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = state === "uploading" ? "none" : "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepth.current = 0;
          setIsDragging(false);
          if (state !== "uploading") void onFiles(event.dataTransfer.files);
        }}
        className={`relative h-[500px] overflow-y-auto rounded-2xl border-2 border-dashed p-3 transition sm:p-4 ${
          isDragging
            ? "border-gray-500 bg-white/80 ring-4 ring-gray-200/70"
            : "border-gray-300 bg-gray-100/80"
        }`}
      >
        {isDragging && (
          <div className="pointer-events-none absolute inset-3 z-20 flex items-center justify-center rounded-xl border border-white/80 bg-white/85 text-center text-gray-800 shadow-lg backdrop-blur-md">
            <div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto h-10 w-10" aria-hidden="true">
                <path d="M12 16V3m-5 5 5-5 5 5" />
                <path d="M5 13v7h14v-7" />
              </svg>
              <p className="mt-3 text-base font-semibold">Suelta las imágenes aquí</p>
              <p className="mt-1 text-xs text-gray-500">Puedes agregar varias al mismo tiempo</p>
            </div>
          </div>
        )}
        {urls.length ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
            {urls.map((src, index) => (
              <button
                key={src}
                type="button"
                onClick={() => setSelectedUrl(src)}
                className="group relative aspect-square overflow-hidden rounded-lg border bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                aria-label={`Ampliar foto de cliente ${index + 1}`}
              >
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition group-hover:scale-105 group-hover:opacity-100" />
                <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1 text-center text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                  Ampliar
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="8.5" cy="9" r="1.5" />
                  <path d="m21 15-5-5L5 20" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No hay fotos subidas</p>
              <p className="mt-1 text-xs text-gray-500">Arrastra imágenes a este cuadro o usa “Agregar imágenes”.</p>
            </div>
          </div>
        )}
      </div>

      {selectedUrl && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-white/70 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Foto ampliada del cliente"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedUrl(null);
          }}
        >
          <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="font-semibold text-gray-900">Foto del cliente</h3>
                <p className="text-xs text-gray-500">Vista ampliada</p>
              </div>
              <button type="button" onClick={() => setSelectedUrl(null)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900" aria-label="Cerrar foto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-center justify-center bg-white/85 p-4">
              <img src={selectedUrl} alt="Foto ampliada del cliente" className="max-h-[72vh] max-w-full rounded-lg object-contain shadow-md" />
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              <button type="button" onClick={() => setSelectedUrl(null)} className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cerrar</button>
              <button
                type="button"
                onClick={() => void deleteFile(selectedUrl)}
                disabled={deletingUrl === selectedUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" />
                </svg>
                {deletingUrl === selectedUrl ? "Eliminando..." : "Eliminar foto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
