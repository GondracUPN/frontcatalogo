"use client";

import React from "react";
import RequestsList from "./RequestsList";
import DeliverySettings from "./DeliverySettings";
import PointStats from "./PointStats";
import AppointmentsAgenda, { AppointmentPrefill } from "./AppointmentsAgenda";

type Tab = "solicitudes" | "agenda" | "entrega" | "estadisticas";

export default function RequestsWorkspace({
  isAdmin,
  initial,
  initialError,
}: {
  isAdmin: boolean;
  initial: { items: any[]; total: number; counts: Record<string, number> };
  initialError: string;
}) {
  const [tab, setTab] = React.useState<Tab>("solicitudes");
  const [prefill, setPrefill] = React.useState<AppointmentPrefill | null>(null);
  const clearPrefill = React.useCallback(() => setPrefill(null), []);
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "solicitudes", label: "Solicitudes" },
    { id: "agenda", label: "Agenda" },
    ...(isAdmin ? ([{ id: "entrega", label: "Entrega y puntos" }, { id: "estadisticas", label: "Estadísticas por punto" }] as const) : []),
  ];

  return (
    <div className="space-y-4">
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Secciones" className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === item.id ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-800"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      {tab === "solicitudes" && <RequestsList initial={initial} initialError={initialError} onSchedule={(data) => { setPrefill(data); setTab("agenda"); }} />}
      {tab === "agenda" && <AppointmentsAgenda prefill={prefill} onPrefillUsed={clearPrefill} />}
      {tab === "entrega" && isAdmin && <DeliverySettings />}
      {tab === "estadisticas" && isAdmin && <PointStats />}
    </div>
  );
}
