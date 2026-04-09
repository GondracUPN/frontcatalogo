import { redirect } from "next/navigation";
import { getSessionUser } from "../../actions";
import ClientesUploader from "./ClientesUploader";

export const dynamic = "force-dynamic";

export default async function ContenidosAdminPage() {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") redirect("/servmacso10?next=/servmacso10/contenidos");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">Configurar contenidos</h1>
        <a href="/servmacso10/servicios" className="inline-flex items-center rounded-lg border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Volver a servicios
        </a>
      </div>
      <p className="text-sm text-gray-600">Pantalla para definir Banner/Promo y Clientes (fotos).</p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold text-gray-900">Banner / Promo</h2>
          <p className="text-sm text-gray-600">Próximamente podrás subir imagen, título y enlace.</p>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <h2 className="font-semibold text-gray-900">Clientes</h2>
          <p className="text-sm text-gray-600">Sube fotos de clientes para mostrar en la página principal.</p>
          <div className="mt-4">
            <ClientesUploader />
          </div>
        </div>
      </div>
    </div>
  );
}
