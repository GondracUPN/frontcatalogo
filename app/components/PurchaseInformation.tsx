type Props = {
  hasAppleWarranty?: boolean;
  appleWarrantyLabel?: string;
};

const DETAIL_CLASS = "rounded-[18px] border border-black/8 bg-white/75 px-4 py-3";
const SUMMARY_CLASS = "cursor-pointer list-none pr-8 text-sm font-semibold text-[color:var(--foreground)] marker:hidden";

export default function PurchaseInformation({ hasAppleWarranty = false, appleWarrantyLabel = "" }: Props) {
  return (
    <section aria-labelledby="purchase-clarity-title" className="rounded-[24px] border border-blue-100 bg-[linear-gradient(145deg,#f8fbff,#eef5ff)] p-4 sm:p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">Información antes de solicitar</div>
      <h2 id="purchase-clarity-title" className="mt-1 text-lg font-semibold text-slate-950">Compra con claridad</h2>

      <div className="mt-4 rounded-[18px] border border-blue-100 bg-white/75 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Cómo comprar</h3>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          <li><strong>1.</strong> Selecciona el equipo.</li>
          <li><strong>2.</strong> Envía una solicitud sin pago.</li>
          <li><strong>3.</strong> Macsomenos confirma la disponibilidad por WhatsApp.</li>
          <li><strong>4.</strong> Se coordinan el pago y la entrega o recojo.</li>
        </ol>
      </div>

      <div className="mt-4 grid gap-2">
        <details className={DETAIL_CLASS} open>
          <summary className={SUMMARY_CLASS}>Garantías y cobertura</summary>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            {hasAppleWarranty && (
              <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
                <strong>Garantía limitada de Apple:</strong> {appleWarrantyLabel || "consulta la cobertura indicada en la ficha del equipo."}
              </div>
            )}
            <p><strong>Garantía de Macsomenos:</strong> durante 6 meses cubre únicamente que el equipo no sea bloqueado por una cuenta de iCloud ajena.</p>
            <p>No cubre bloqueos ocasionados por la cuenta o las credenciales del propio comprador, como olvidar su contraseña, ni problemas relacionados con FileVault.</p>
          </div>
        </details>

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Cómo inspeccionamos el equipo</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            <p>Limpiamos el equipo con alcohol isopropílico y retiramos stickers, suciedad y polvo del teclado, la pantalla y la carcasa externa.</p>
            <p>Para comprobar el estado interno utilizamos la herramienta de diagnóstico de Apple.</p>
          </div>
        </details>

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Métodos de pago</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            <p>Aceptamos transferencias a BCP, Interbank y BBVA.</p>
            <p>También aceptamos tarjeta de crédito con una comisión de 3.5%. La comisión se coordina antes del pago y no está incluida automáticamente en los precios mostrados.</p>
          </div>
        </details>

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Entrega y recojo</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            <p>El recojo en el almacén siempre es gratuito.</p>
            <p><strong>Precio fijo mayor a S/ 1,800:</strong> entrega gratuita en Mall del Sur, Jockey Plaza, Real Plaza Guardia Civil, Real Plaza Centro Cívico, Larcomar y Plaza Lima Sur.</p>
            <p><strong>Precio fijo entre S/ 1,000 y S/ 1,800:</strong> entrega gratuita en Mall del Sur, Real Plaza Guardia Civil, Real Plaza Centro Cívico y Plaza Lima Sur.</p>
            <p><strong>Precio fijo menor a S/ 1,000:</strong> entrega gratuita únicamente en el almacén. Otros puntos tienen costo.</p>
            <p>Si se acepta una oferta sobre el precio publicado, el costo de entrega puede variar según la distancia del centro comercial acordado.</p>
          </div>
        </details>

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Devoluciones</summary>
          <p className="mt-3 text-sm leading-6 text-slate-700">No se aceptan devoluciones después de que el comprador prueba completamente el equipo y confirma su conformidad. Cualquier observación debe comunicarse durante esa revisión.</p>
        </details>

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Qué significa cada estado</summary>
          <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            <div><dt className="font-semibold text-slate-950">Nuevo</dt><dd>Paquete sellado, sin uso y con 1 año de garantía limitada de Apple.</dd></div>
            <div><dt className="font-semibold text-slate-950">Open Box</dt><dd>Equipo abierto que puede estar sin usar y conservar 1 año de garantía, o tener muy poco uso; no presenta detalles estéticos ni de otro tipo y tiene muy pocos ciclos.</dd></div>
            <div><dt className="font-semibold text-slate-950">Usado</dt><dd>Equipo usado que puede presentar detalles mínimos propios del uso y, en algunos casos, una cantidad regular de ciclos. Cualquier detalle informado se muestra en la ficha.</dd></div>
          </dl>
        </details>
      </div>

    </section>
  );
}
