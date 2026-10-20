"use client";

import { useEffect, useState } from "react";
import { formatSoles, withIgv } from "@/lib/catalog-price";

// Barra inferior en móvil cuando la acción principal queda fuera de pantalla.
// Lleva a la acción en lugar de ejecutarla, para que el cliente vea qué hará.
export default function MobileProductAction({ price, unavailable, isPreventa = false }: { price: number; unavailable: boolean; isPreventa?: boolean }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const target = document.getElementById("product-action");
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), { threshold: 0.1 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-[color:var(--border)] bg-white/95 px-4 py-3 shadow-lg backdrop-blur-lg lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
      <div>
        <div className="text-xs text-[color:var(--foreground-soft)]">Total con IGV</div>
        <div className="text-lg font-bold">{formatSoles(withIgv(price))}</div>
      </div>
      <a href="#product-action" className="inline-flex min-h-12 items-center rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-white">
        {unavailable ? "Ver opciones" : isPreventa ? "Solicitar separación" : "Solicitar este equipo"}
      </a>
    </div>
  );
}
