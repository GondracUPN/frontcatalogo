import { redirect } from "next/navigation";
import { getCatalogAnalytics, getSessionUser } from "../../actions";

function StatCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-[0.18em] text-gray-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-gray-900">{value}</div>
      {note ? <div className="mt-2 text-sm text-gray-500">{note}</div> : null}
    </div>
  );
}

export default async function AnalisisPage() {
  const me = await getSessionUser();
  if (!me || me.role !== "admin") redirect("/servmacso10?next=/servmacso10/analisis");

  const analytics = await getCatalogAnalytics(30);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">Analisis</div>
          <h1 className="mt-2 text-3xl font-semibold text-gray-900">Vistas del catalogo</h1>
          <p className="mt-2 text-sm text-gray-500">Resumen de trafico de los ultimos {analytics.days} dias por categoria y producto.</p>
        </div>
        <a href="/servmacso10/servicios" className="inline-flex rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50">
          Volver al panel
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vistas totales" value={String(analytics.summary.totalViews)} />
        <StatCard label="Visitantes" value={String(analytics.summary.uniqueVisitors)} />
        <StatCard label="Categorias" value={String(analytics.summary.categoriesCount)} />
        <StatCard label="Productos vistos" value={String(analytics.summary.productsCount)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-2xl border bg-white p-5">
          <div className="text-lg font-semibold text-gray-900">Categorias</div>
          <div className="mt-4 space-y-3">
            {analytics.categories.length ? (
              analytics.categories.map((category: any) => (
                <div key={category.category} className="rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{category.category}</div>
                      <div className="mt-1 text-xs text-gray-500">{category.productsCount} productos</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-gray-900">{category.totalViews}</div>
                      <div className="text-xs text-gray-500">vistas</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">{category.uniqueVisitors} visitantes</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500">Aun no hay vistas registradas.</div>
            )}
          </div>
        </aside>

        <section className="space-y-6">
          {analytics.categories.length ? (
            analytics.categories.map((category: any) => (
              <div key={category.category} className="rounded-2xl border bg-white p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{category.category}</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {category.totalViews} vistas, {category.uniqueVisitors} visitantes, {category.productsCount} productos.
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="px-3 py-3 font-medium">Producto</th>
                        <th className="px-3 py-3 font-medium">Vistas</th>
                        <th className="px-3 py-3 font-medium">Visitantes</th>
                        <th className="px-3 py-3 font-medium">Ultima vista</th>
                        <th className="px-3 py-3 font-medium">Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.products.map((product: any) => (
                        <tr key={product.productId} className="border-b last:border-b-0">
                          <td className="px-3 py-3 text-gray-900">{product.title}</td>
                          <td className="px-3 py-3 text-gray-900">{product.totalViews}</td>
                          <td className="px-3 py-3 text-gray-900">{product.uniqueVisitors}</td>
                          <td className="px-3 py-3 text-gray-900">
                            {product.lastViewedAt ? new Date(product.lastViewedAt).toLocaleString() : "-"}
                          </td>
                          <td className="px-3 py-3">
                            <a
                              href={`/product/${product.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#0071e3] hover:underline"
                            >
                              Ver producto
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500">
              Aun no hay datos de trafico. Las vistas se empezaran a registrar cuando los clientes entren a los productos.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
