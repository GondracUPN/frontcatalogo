"use client";

import { useEffect } from "react";

function stripInjectedAttributes(node: Element) {
  const attrs = Array.from(node.attributes || []);
  for (const attr of attrs) {
    const name = attr?.name || "";
    if (name === "bis_register" || name === "bis_skin_checked" || name.startsWith("bis_")) {
      try {
        node.removeAttribute(name);
      } catch {}
    }
  }
}

function removeInjectedNodes(root: ParentNode) {
  const ids = ["ocid-drop-box-container", "ocid-floating-overlay"];
  for (const id of ids) {
    const el = root.querySelector?.(`#${id}`);
    if (el && el.parentNode) {
      try {
        el.parentNode.removeChild(el);
      } catch {}
    }
  }
}

export default function ClientDomCleanup() {
  useEffect(() => {
    const root = document.documentElement;

    removeInjectedNodes(root);
    root.querySelectorAll("*").forEach((el) => stripInjectedAttributes(el));

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.target instanceof Element) {
          stripInjectedAttributes(m.target);
        }
        if (m.type === "childList") {
          m.addedNodes.forEach((n) => {
            if (n instanceof Element) {
              stripInjectedAttributes(n);
              removeInjectedNodes(n);
            }
          });
        }
      }
    });

    observer.observe(root, { attributes: true, childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
