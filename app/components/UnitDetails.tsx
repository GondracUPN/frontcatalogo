// «Detalles de esta unidad»: una sola estructura para equipos nuevos, open box
// y usados. Solo recibe datos registrados (las filas vacías ya vienen fuera).
// Si la condición tiene poco que contar (p. ej. un equipo nuevo con solo su
// estado), sus filas se integran en la cuadrícula de especificaciones en lugar
// de dejar una columna casi vacía.

export type DetailRow = { label: string; value: string; note?: string; muted?: boolean };

function Rows({ rows, columns }: { rows: DetailRow[]; columns: string }) {
  return (
    <dl className={`grid gap-x-8 text-sm ${columns}`}>
      {rows.map((row) => (
        <div key={row.label} className="flex min-w-0 flex-col border-b border-[color:var(--border)] py-2.5 sm:grid sm:grid-cols-[minmax(7.5rem,0.8fr)_minmax(0,1.2fr)] sm:gap-4">
          <dt className="text-[color:var(--foreground-soft)]">{row.label}</dt>
          <dd className="min-w-0 break-words">
            <span className={row.muted ? "italic text-[color:var(--foreground-soft)]" : "font-medium text-[color:var(--foreground)]"}>{row.value}</span>
            {row.note && <span className="mt-0.5 block text-[13px] leading-5 text-[color:var(--foreground-soft)]">{row.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default function UnitDetails({ specs, condition, photoCount }: { specs: DetailRow[]; condition: DetailRow[]; photoCount: number }) {
  if (!specs.length && !condition.length) return null;
  const split = condition.length >= 2 && specs.length >= 3;
  return (
    <section aria-labelledby="unit-details-title" className="surface-card soft-outline mt-6 px-4 py-6 sm:px-8 sm:py-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="unit-details-title" className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--foreground)] sm:text-2xl">Detalles de esta unidad</h2>
        {photoCount > 0 && <a href="#galeria" className="text-sm font-semibold text-[color:var(--accent-strong)] hover:underline">{photoCount === 1 ? "Ver la foto" : `Ver las ${photoCount} fotos`}</a>}
      </div>
      {split ? (
        <div className="mt-4 grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">Especificaciones</h3>
            <div className="mt-1"><Rows rows={specs} columns="sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2" /></div>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground-soft)]">Estado de la unidad</h3>
            <div className="mt-1"><Rows rows={condition} columns="" /></div>
          </div>
        </div>
      ) : (
        <div className="mt-3"><Rows rows={[...condition, ...specs]} columns="sm:grid-cols-2 lg:grid-cols-3" /></div>
      )}
    </section>
  );
}
