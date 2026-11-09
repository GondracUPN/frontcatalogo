"use client";
import React from "react";

export default function ProductPhotosPanel({ images, setImages, onEdit, onAddFiles, editorModal, disabled = false, uploading = false }: {
  images: string[]; setImages: React.Dispatch<React.SetStateAction<string[]>>;
  onEdit: (url: string) => void; onAddFiles: (files: FileList | null) => void;
  editorModal: React.ReactNode; disabled?: boolean; uploading?: boolean;
}) {
  const [dragImageIndex, setDragImageIndex] = React.useState<number | null>(null);
  const moveImage = (from: number, to: number) => {
    if (disabled || !Number.isInteger(from) || from === to || from < 0 || to < 0) return;
    setImages((arr) => {
      if (from >= arr.length || to >= arr.length) return arr;
      const next = arr.slice(); const [image] = next.splice(from, 1); next.splice(to, 0, image); return next;
    });
  };
  return (
    <div>
      {editorModal}
      <label className="block text-sm mb-1 text-gray-700">Fotos</label>
      {images.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl border-2 border-emerald-500 bg-emerald-50">
          <div className="relative aspect-[4/3] bg-white">
            <img src={images[0]} alt="" className="h-full w-full object-contain" />
            <div className="absolute left-2 top-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow">
              Portada
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-2">
        {images.map((u, i) => (
          <div
            key={`${u}-${i}`}
            draggable={!disabled}
            onDragStart={(e) => {
              setDragImageIndex(i);
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", String(i));
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const from = dragImageIndex ?? Number(e.dataTransfer.getData("text/plain"));
              moveImage(from, i);
              setDragImageIndex(null);
            }}
            onDragEnd={() => setDragImageIndex(null)}
            className={`cursor-grab overflow-hidden rounded-xl border bg-white active:cursor-grabbing ${
              dragImageIndex === i ? "scale-[0.98] opacity-55" : ""
            } ${i === 0 ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200"}`}
          >
            <div className="relative aspect-square bg-gray-50">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <div className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${i === 0 ? "bg-emerald-600 text-white" : "bg-white/90 text-gray-700"}`}>
                {i === 0 ? "Portada" : `Foto ${i + 1}`}
              </div>
              <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                Arrastra
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1">
              <button type="button" aria-label={`Editar imagen ${i + 1}`} title="Editar imagen" className="col-span-2 rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-800" onClick={() => onEdit(u)}>✎ Editar imagen</button>
              <button
                type="button"
                disabled={i === 0}
                className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 disabled:bg-emerald-100 disabled:text-emerald-700"
                onClick={() => setImages(arr => { const copy = arr.slice(); const [img] = copy.splice(i, 1); copy.unshift(img); return copy; })}
              >
                {i === 0 ? "Actual" : "Portada"}
              </button>
              <button
                type="button"
                className="rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                onClick={() => setImages(arr => arr.filter((_, idx) => idx !== i))}
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (disabled) return;
          onAddFiles(e.dataTransfer.files);
        }}
        className={`mt-3 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition ${
          disabled
            ? "border-gray-200 bg-gray-50 text-gray-400"
            : "border-blue-200 bg-blue-50/55 text-gray-700 hover:border-blue-300 hover:bg-blue-50"
        }`}
      >
        <input
          aria-label="Fotografías"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/avif"
          disabled={disabled}
          onChange={(e) => {
            onAddFiles(e.target.files);
            e.currentTarget.value = "";
          }}
          className="sr-only"
        />
        <span className="text-sm font-semibold">{uploading ? "Subiendo fotos..." : "Elegir o arrastrar fotos"}</span>
        <span className="mt-1 text-xs text-gray-500">JPG, PNG o AVIF. Puedes seleccionar varias imágenes.</span>
      </label>
      {uploading && <p className="text-xs text-blue-600 mt-1">Subiendo fotos...</p>}
      <p className="text-xs text-gray-500 mt-1">La foto marcada como portada será la primera imagen del producto.</p>
    </div>
  );

}
