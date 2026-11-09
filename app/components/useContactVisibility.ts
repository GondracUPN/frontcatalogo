"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** Evita acciones fijas sobre ventanas, cookies, teclado o la consulta principal. */
export function useContactVisibility(primarySelector = "[data-contact-primary]") {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    let frame = 0;
    const inView = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 80 && rect.top < window.innerHeight;
    };
    const check = () => {
      frame = 0;
      const editing = document.activeElement?.matches("input, textarea, select, [contenteditable='true']");
      const keyboard = window.visualViewport && window.visualViewport.height < window.innerHeight * 0.75;
      const overlay = document.body.style.overflow === "hidden" || [...document.querySelectorAll('[role="dialog"], [aria-label="Aviso de cookies"], dialog[open], [role="listbox"], [aria-label="Equipos elegidos para comparar"]')].some(inView);
      const primary = [...document.querySelectorAll(primarySelector)].some(inView);
      setVisible(!editing && !keyboard && !overlay && !primary);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    document.addEventListener("focusin", schedule);
    document.addEventListener("focusout", schedule);
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "open"] });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      document.removeEventListener("focusin", schedule);
      document.removeEventListener("focusout", schedule);
    };
  }, [pathname, primarySelector]);
  return visible;
}
