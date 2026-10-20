import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../../actions";
import { listRequestsAction } from "./actions";
import RequestsWorkspace from "./RequestsWorkspace";

export const dynamic = "force-dynamic";

export default async function SolicitudesPage() {
  const me = await getSessionUser();
  if (!me || !["admin", "vendedor"].includes(String(me.role).toLowerCase())) redirect("/servmacso10?next=/servmacso10/solicitudes");
  const isAdmin = String(me.role).toLowerCase() === "admin";
  const initial = await listRequestsAction({ status: "activas" });

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-5 sm:px-6 sm:py-8">
      <div>
        <Link href="/servmacso10/servicios" className="text-sm text-gray-600 hover:text-gray-900">← Panel</Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Solicitudes de compra</h1>
        <p className="mt-1 text-sm text-gray-600">Seguimiento de cada solicitud: estados, historial, reservas y entrega.</p>
      </div>
      <RequestsWorkspace
        isAdmin={isAdmin}
        initial={initial.ok ? initial.data : { items: [], total: 0, counts: {} }}
        initialError={initial.ok ? "" : initial.error}
      />
    </div>
  );
}
