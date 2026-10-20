import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../../actions";
import AnalyticsDashboard from "./AnalyticsDashboard";

export const dynamic = "force-dynamic";

export default async function AnalisisPage() {
  const me = await getSessionUser();
  if (!me || String(me.role).toLowerCase() !== "admin") redirect("/servmacso10?next=/servmacso10/analisis");

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-3 py-5 sm:px-6 sm:py-8">
      <div>
        <Link href="/servmacso10/servicios" className="text-sm text-gray-600 hover:text-gray-900">← Panel</Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Análisis</h1>
        <p className="mt-1 text-sm text-gray-600">Tráfico, interés por producto, búsquedas, embudo comercial y procedencia de las visitas.</p>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
