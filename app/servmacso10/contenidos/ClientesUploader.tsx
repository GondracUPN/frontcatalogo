"use client";

import { useEffect, useState } from "react";

type UploadState = "idle" | "uploading" | "error";

export default function ClientesUploader() {
  const [state, setState] = useState<UploadState>("idle");
  const [urls, setUrls] = useState<string[]>([]);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);

  const loadList = async () => {
    try {
      const res = await fetch("/api/admin/clientes/list", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok && Array.isArray(json.urls)) setUrls(json.urls);
    } catch {
      setUrls([]);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/clientes/upload", { method: "POST", body: fd });
    const json = await res.json();
    if (!json?.ok) throw new Error("upload failed");
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setState("uploading");
    try {
      for (const f of Array.from(files)) {
        await uploadFile(f);
      }
      await loadList();
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const deleteFile = async (url: string) => {
    setDeletingUrl(url);
    try {
      const res = await fetch("/api/admin/clientes/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error("delete failed");
      await loadList();
      setState("idle");
    } catch {
      setState("error");
    } finally {
      setDeletingUrl(null);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => onFiles(e.target.files)}
        className="block w-full text-sm"
      />
      {state === "uploading" && <div className="text-xs text-gray-500">Subiendo...</div>}
      {state === "error" && <div className="text-xs text-red-600">Error al subir. Intenta otra vez.</div>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {urls.length ? (
          urls.map((src) => (
            <div key={src} className="relative group aspect-[4/3] rounded-lg overflow-hidden border bg-gray-100">
              <img src={src} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => deleteFile(src)}
                disabled={deletingUrl === src || state === "uploading"}
                className="absolute top-2 right-2 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingUrl === src ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          ))
        ) : (
          <div className="text-xs text-gray-500">No hay fotos subidas.</div>
        )}
      </div>
    </div>
  );
}
