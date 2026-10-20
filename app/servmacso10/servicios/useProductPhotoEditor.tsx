"use client";
import React from "react";
import dynamic from "next/dynamic";

const PhotoEditor = dynamic(() => import("./PhotoEditor"), { ssr: false });

export function useProductPhotoEditor(
  item: {
    id?: string;
    product_id?: string;
    source_id?: string;
    staged?: { id?: string; source_id?: string };
  },
  images: string[],
  setImages: React.Dispatch<React.SetStateAction<string[]>>,
  upload: (f: File) => Promise<string>,
) {
  const pending = React.useRef(new Map<string, File>()),
    urls = React.useRef(new Set<string>());
  const uploaded = React.useRef(new Map<string, string>());
  const [editing, setEditing] = React.useState<string | null>(null);
  React.useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      pending.current.clear();
    },
    [],
  );
  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const inputs = Array.from(files);
    if (
      inputs.some(
        (f) => !f.type.startsWith("image/") || f.size > 64 * 1024 * 1024,
      )
    )
      throw new Error("Usa imágenes de hasta 64 MB");
    const added = inputs.map((f) => {
      const url = URL.createObjectURL(f);
      urls.current.add(url);
      pending.current.set(url, f);
      return url;
    });
    setImages((prev) => [...prev, ...added]);
  };
  const resolveImages = async () => {
    const result: string[] = [];
    for (const url of images) {
      const file = pending.current.get(url);
      let saved = uploaded.current.get(url);
      if (file && !saved) {
        saved = await upload(file);
        uploaded.current.set(url, saved);
      }
      result.push(saved || url);
    }
    return result;
  };
  const modal = editing ? (
    <PhotoEditor
      source={pending.current.get(editing) || editing}
      onClose={() => setEditing(null)}
      onSave={async (file) => {
        if (pending.current.has(editing)) {
          const url = URL.createObjectURL(file);
          urls.current.add(url);
          pending.current.set(url, file);
          setImages((prev) => prev.map((u) => (u === editing ? url : u)));
          pending.current.delete(editing);
          URL.revokeObjectURL(editing);
          urls.current.delete(editing);
        } else {
          const data = new FormData();
          data.set("file", file);
          data.set(
            "productId",
            String(
              item.product_id ||
                item.source_id ||
                item.staged?.id ||
                item.staged?.source_id ||
                item.id,
            ),
          );
          data.set("url_old", editing);
          const res = await fetch("/api/admin/upload/replace", {
            method: "POST",
            body: data,
          });
          const result = await res.json();
          if (!res.ok || !result.ok)
            throw new Error(
              result.message || "No se pudo reemplazar la imagen",
            );
          setImages((prev) =>
            prev.map((u) => (u === editing ? result.url : u)),
          );
          window.dispatchEvent(new Event("catalog-products-updated"));
          window.dispatchEvent(new Event("staged-products-updated"));
        }
      }}
    />
  ) : null;
  return { addFiles, resolveImages, edit: setEditing, modal };
}
