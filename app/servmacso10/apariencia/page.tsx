import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "../../actions";
import { listPresetsAction, listThemesAction } from "./actions";
import ThemesManager from "./ThemesManager";

export const dynamic = "force-dynamic";

export default async function AparienciaPage() {
  const me = await getSessionUser();
  if (!me) redirect("/servmacso10?next=/servmacso10/apariencia");
  if (String(me.role).toLowerCase() !== "admin") redirect("/servmacso10/servicios");

  const year = new Date().getFullYear();
  const [themes, presets] = await Promise.all([listThemesAction(), listPresetsAction(year)]);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/servmacso10/servicios" className="text-sm text-gray-600 hover:text-gray-900">← Panel</Link>
          <h1 className="mt-1 text-2xl font-semibold text-gray-900">Apariencia y temáticas</h1>
          <p className="mt-1 text-sm text-gray-600">Decora la web por temporadas. Fuera de las fechas programadas vuelve sola al diseño normal.</p>
        </div>
      </div>
      <ThemesManager
        initialThemes={themes.ok ? themes.data.items : []}
        initialActiveId={themes.ok ? themes.data.activeId : null}
        initialPresets={presets.ok ? presets.data.items : []}
        initialYear={year}
        loadError={themes.ok ? "" : themes.error}
      />
    </div>
  );
}
