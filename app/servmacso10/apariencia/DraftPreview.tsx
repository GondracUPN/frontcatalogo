"use client";

import React from "react";
import { DRAFT_MESSAGE, DRAFT_READY } from "@/app/components/theme/SiteThemeProvider";

const DESKTOP_WIDTH = 1440;
const MOBILE_WIDTH = 390;

/**
 * Vista previa real: la web pública (mismos componentes) en un iframe del mismo
 * origen, que recibe el borrador por postMessage. Nada se guarda ni se publica.
 */
export default function DraftPreview({ theme }: { theme: unknown }) {
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  const [page, setPage] = React.useState<"/" | "/ofertas">("/");
  const [box, setBox] = React.useState({ width: 800, height: 600 });
  const themeRef = React.useRef(theme);
  themeRef.current = theme;

  const send = React.useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: DRAFT_MESSAGE, theme: themeRef.current }, window.location.origin);
  }, []);

  // El iframe avisa cuando está listo (también tras navegar dentro de él).
  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.type === DRAFT_READY) send();
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [send]);

  // Cada cambio del borrador se refleja al instante (con un pequeño respiro al escribir).
  React.useEffect(() => {
    const timer = window.setTimeout(send, 120);
    return () => window.clearTimeout(timer);
  }, [theme, send]);

  React.useEffect(() => {
    const node = boxRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const width = device === "desktop" ? DESKTOP_WIDTH : MOBILE_WIDTH;
  const scale = Math.min(1, box.width / width);
  const button = (active: boolean) => `min-h-9 rounded-lg px-3 text-sm font-medium ${active ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"}`;

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Dispositivo" className="flex gap-1">
          <button type="button" className={button(device === "desktop")} aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Escritorio</button>
          <button type="button" className={button(device === "mobile")} aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Móvil</button>
        </div>
        <div role="group" aria-label="Página" className="flex gap-1">
          <button type="button" className={button(page === "/")} aria-pressed={page === "/"} onClick={() => setPage("/")}>Inicio</button>
          <button type="button" className={button(page === "/ofertas")} aria-pressed={page === "/ofertas"} onClick={() => setPage("/ofertas")}>Ofertas</button>
        </div>
        <span className="text-xs text-gray-500">Borrador sin guardar · productos reales del catálogo</span>
      </div>
      <div ref={boxRef} className="relative flex-1 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
        <iframe
          ref={frameRef}
          key={`${page}-${device}`}
          title="Vista previa del borrador"
          src={`${page}?theme_draft=1`}
          className="absolute left-1/2 top-0 origin-top border-0 bg-white"
          style={{ width, height: box.height / scale, transform: `translateX(-50%) scale(${scale})` }}
        />
      </div>
    </div>
  );
}
