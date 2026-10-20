"use client";

import { usePathname } from "next/navigation";
import React from "react";
import { trackPageView } from "@/lib/analytics";

/** Registra una vista por cada página que el visitante abre (incluida la navegación interna). */
export default function PageViewTracker() {
  const pathname = usePathname();
  React.useEffect(() => {
    trackPageView();
  }, [pathname]);
  return null;
}
