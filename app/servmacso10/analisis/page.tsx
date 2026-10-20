import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../../actions";
import AnalyticsDashboard from "./AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AnalisisPage() {
  const me = await getSessionUser();
  if (!me || !["admin","vendedor"].includes(String(me.role).toLowerCase())) redirect("/servmacso10?next=/servmacso10/analisis");

  const isAdmin = String(me.role).toUpperCase() === "ADMIN";
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:px-6 sm:py-8">
      <div>
        <Link href="/servmacso10/servicios" className="text-sm text-gray-600 hover:text-gray-900">← Panel</Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">{isAdmin ? "Análisis" : "Mis ventas"}</h1>
        <p className="mt-1 text-sm text-gray-600">{isAdmin ? "Tráfico y ventas de Macsomenos y sus vendedores." : "Tus ingresos, productos e inventario. Solo se muestran los datos de tu alcance."}</p>
      </div>
      <AnalyticsDashboard isAdmin={isAdmin} />
    </div>
  );
}
