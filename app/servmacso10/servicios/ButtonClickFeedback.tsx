"use client";

import React from "react";

const FEEDBACK_CLASS = "services-button-clicked";

export default function ButtonClickFeedback() {
  React.useEffect(() => {
    const timers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>();

    const showFeedback = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>(".services-panel button");
      if (!button || button.disabled) return;

      const currentTimer = timers.get(button);
      if (currentTimer) clearTimeout(currentTimer);

      button.classList.remove(FEEDBACK_CLASS);
      void button.offsetWidth;
      button.classList.add(FEEDBACK_CLASS);

      const timer = setTimeout(() => {
        button.classList.remove(FEEDBACK_CLASS);
        timers.delete(button);
      }, 280);
      timers.set(button, timer);
    };

    document.addEventListener("click", showFeedback, true);
    return () => document.removeEventListener("click", showFeedback, true);
  }, []);

  return null;
}
