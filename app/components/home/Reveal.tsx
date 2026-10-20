"use client";

import React from "react";

// Hace aparecer las partes de una sección (título, texto, imágenes) en orden
// cuando entra en pantalla. Sin JavaScript, o con «reducir movimiento», el
// contenido se ve siempre: la clase que lo oculta solo se pone desde aquí.
export default function Reveal({ children, className = "", as: Tag = "section", ...rest }: React.HTMLAttributes<HTMLElement> & { as?: "section" | "div" }) {
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    node.classList.add("ms-reveal");
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add("is-visible");
        observer.disconnect();
      }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <Tag ref={ref as React.Ref<HTMLElement & HTMLDivElement>} className={className} {...rest}>{children}</Tag>;
}
