"use client";

import React from "react";
import { usePathname } from "next/navigation";

function isInternalNavigation(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href") || "";
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  try {
    const url = new URL(anchor.href);
    return url.origin === window.location.origin && url.href !== window.location.href;
  } catch {
    return false;
  }
}

export default function NavigationProgress() {
  const pathname = usePathname();
  const [pending, setPending] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setPending(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [pathname]);

  React.useEffect(() => {
    const start = () => {
      setPending(true);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setPending(false), 4500);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (anchor && isInternalNavigation(anchor)) start();
    };

    const onPopState = () => start();
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 bg-transparent transition-opacity duration-150 ${pending ? "opacity-100" : "opacity-0"}`}
    >
      <div className="h-full w-2/3 origin-left animate-[route-progress_1.1s_ease-in-out_infinite] rounded-r-full bg-[color:var(--accent)] shadow-[0_0_18px_rgba(26,115,232,0.55)]" />
    </div>
  );
}
