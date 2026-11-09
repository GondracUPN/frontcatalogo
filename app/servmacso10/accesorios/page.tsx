import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, listStaged, listAdminCatalog } from "../../actions";
import InventoryCatalogPanels from "../servicios/InventoryCatalogPanels";
import AccessoryButton from "../servicios/AccessoryButton";

export const dynamic = "force-dynamic";

export default async function AccessoriesAdminPage() {
  const me = await getSessionUser();
  if (!me || !["admin", "vendedor"].includes(String(me.role).toLowerCase())) redirect("/servmacso10?next=/servmacso10/accesorios");
  const [inventory, catalog] = await Promise.all([listStaged({ pageSize: "all" }), listAdminCatalog()]);
  const items = inventory.items.filter((item: any) => item.category === "accesorios");
  const published = catalog.items.filter((item: any) => (item.category || item.staged?.category) === "accesorios");
  return <main className="services-panel mx-auto max-w-7xl space-y-6 px-4 py-8 text-gray-900">
    <Link href="/servmacso10/servicios" className="text-blue-700">← Panel de Servicios</Link>
    <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-2xl font-semibold">Accesorios</h1><AccessoryButton /></div>
    <InventoryCatalogPanels inventoryItems={items} catalogItems={published} sealedPresets={[]} canDelete={String(me.role).toLowerCase() === "admin"} category="accesorios" />
  </main>;
}
