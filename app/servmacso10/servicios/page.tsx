import { redirect } from "next/navigation";
import { getSessionUser, logoutAction, listStaged, listAdminCatalog } from "../../actions";
export const dynamic = "force-dynamic";
import React from "react";
import StagedManager from "./StagedManager";
import CatalogManager from "./CatalogManager";
import AdminToolbar from "./AdminToolbar";
import PreventaManualButton from "./PreventaManualButton";
import ContactAlertsPanel from "./ContactAlertsPanel";
import SoldProductsPanel from "./SoldProductsPanel";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border p-5">
      <h2 className="text-xl font-semibold mb-3 text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 bg-gray-50 rounded-xl border">
      <div className="text-xs text-gray-700">{label}</div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default async function ServiciosPage() {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") redirect("/servmacso10?next=/servmacso10/servicios");
  const [{ items }, { items: published }] = await Promise.all([
    listStaged({ pageSize: "all" }),
    listAdminCatalog().catch(() => ({ items: [] as any[] })),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Panel de Servicios</h1>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex gap-3">
            <Stat label="Usuario" value={me.username} />
            <Stat label="Rol" value={me.role} />
          </div>
          <AdminToolbar />
          <PreventaManualButton />
          <a href="/servmacso10/analisis" className="bg-[#0071e3] hover:bg-[#0a84ff] text-white rounded px-4 py-2">Analisis</a>
          <a href="/servmacso10/contenidos" className="bg-gray-900 hover:bg-black text-white rounded px-4 py-2">Configurar contenidos</a>
          <form action={logoutAction}>
            <input type="hidden" name="next" value="/servmacso10" />
            <button className="bg-red-600 hover:bg-red-700 text-white rounded px-4 py-2">Cerrar sesión</button>
          </form>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <SoldProductsPanel initialSales={[]} />
        <ContactAlertsPanel initialItems={[]} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Section title="Inventario">
          <StagedManager initialItems={items} />
        </Section>
        <Section title="Catálogo">
          <CatalogManager initialItems={published} inventoryItems={items} />
        </Section>
      </div>
    </div>
  );
}






