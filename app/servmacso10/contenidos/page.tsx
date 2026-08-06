import { redirect } from "next/navigation";
import { getSessionUser, listCatalogRepairs } from "../../actions";
import CatalogRepairsPanel from "./CatalogRepairsPanel";
import ClientesUploader from "./ClientesUploader";
import ProductVersionsEditor from "./ProductVersionsEditor";

export const dynamic = "force-dynamic";

export default async function ContenidosAdminPage() {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") redirect("/servmacso10?next=/servmacso10/contenidos");
  const repairLoad = await listCatalogRepairs()
    .then((result) => ({ result, error: "" }))
    .catch(() => ({
      result: { items: [], total: 0 },
      error: "No se pudo cargar el diagnóstico del catálogo. Intenta actualizar nuevamente.",
    }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Configurar contenidos</h1>
        <a href="/servmacso10/servicios" className="inline-flex items-center rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Volver a servicios
        </a>
      </div>
      <p className="text-sm text-gray-600">Revisa problemas del catálogo, clientes y versiones de productos.</p>

      <CatalogRepairsPanel initialItems={repairLoad.result.items} initialError={repairLoad.error} />

      <div className="rounded-2xl border bg-white p-4">
        <h2 className="font-semibold text-gray-900">Clientes</h2>
        <p className="text-sm text-gray-600">Sube fotos de clientes para mostrar en la página principal.</p>
        <div className="mt-4">
          <ClientesUploader />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <ProductVersionsEditor />
      </div>
    </div>
  );
}
