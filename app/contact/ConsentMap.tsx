"use client";

import React from "react";

// El mapa de Google se carga solo cuando el visitante lo pide: el iframe
// conecta con Google y puede crear cookies de terceros.
export default function ConsentMap({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = React.useState(false);
  if (loaded) {
    return (
      <iframe
        title={title}
        src={src}
        className="h-[320px] w-full sm:h-[380px]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    );
  }
  return (
    <div className="flex h-[320px] w-full flex-col items-center justify-center gap-3 bg-[color:var(--surface-muted)] px-6 text-center sm:h-[380px]">
      <p className="max-w-sm text-sm leading-6 text-[color:var(--foreground-soft)]">
        El mapa se muestra con Google Maps. Al cargarlo, Google puede guardar cookies en tu navegador.
      </p>
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className="min-h-11 rounded-full bg-[color:var(--foreground)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Cargar mapa
      </button>
    </div>
  );
}
