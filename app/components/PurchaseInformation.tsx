import Link from "next/link";
import { CONDITION_INFO } from "@/lib/catalog-display";
import { DELIVERY_RULES, WAREHOUSE_MAP_URL, MACBOOK_INSPECTION, MACSOMENOS_WARRANTY, PAYMENT_METHODS, PURCHASE_STEPS, RETURNS_POLICY, warrantyExclusion } from "@/lib/help-content";

type Props = {
  category?: string;
  hasAppleWarranty?: boolean;
  appleWarrantyLabel?: string;
};

const DETAIL_CLASS = "rounded-[18px] border border-black/8 bg-white/75 px-4 py-3";
const SUMMARY_CLASS = "cursor-pointer list-none pr-8 text-sm font-semibold text-[color:var(--foreground)] marker:hidden";

export default function PurchaseInformation({ category = "", hasAppleWarranty = false, appleWarrantyLabel = "" }: Props) {
  return (
    <section aria-labelledby="purchase-clarity-title" className="rounded-[24px] border border-blue-100 bg-[linear-gradient(145deg,#f8fbff,#eef5ff)] p-4 sm:p-5">
      <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">Información antes de solicitar</div>
      <h2 id="purchase-clarity-title" className="mt-1 text-lg font-semibold text-slate-950">Compra con claridad</h2>

      <div className="mt-4 rounded-[18px] border border-blue-100 bg-white/75 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Cómo comprar</h3>
        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {PURCHASE_STEPS.map((step, index) => <li key={step}><strong>{index + 1}.</strong> {step}</li>)}
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
            <p><strong>Garantía de Macsomenos:</strong> {MACSOMENOS_WARRANTY.charAt(0).toLowerCase() + MACSOMENOS_WARRANTY.slice(1)}</p>
            <p>{warrantyExclusion(category)}</p>
          </div>
        </details>

        {category === "macbook" && <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Cómo inspeccionamos el equipo</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {MACBOOK_INSPECTION.map((text) => <p key={text}>{text}</p>)}
          </div>
        </details>}

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Métodos de pago</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {PAYMENT_METHODS.map((text) => <p key={text}>{text}</p>)}
          </div>
        </details>

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Entrega y recojo</summary>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {DELIVERY_RULES.map((rule) => <p key={rule.text}>{rule.label && <strong>{rule.label}</strong>} {rule.text}</p>)}
            <p><a href={WAREHOUSE_MAP_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-[color:var(--accent-strong)] underline-offset-4 hover:underline">Ver ubicación del almacén en Google Maps</a></p>
          </div>
        </details>

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Devoluciones</summary>
          <p className="mt-3 text-sm leading-6 text-slate-700">{RETURNS_POLICY}</p>
        </details>

        <details className={DETAIL_CLASS}>
          <summary className={SUMMARY_CLASS}>Qué significa cada estado</summary>
          <dl className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
            {CONDITION_INFO.map((info) => (
              <div key={info.key}><dt className="font-semibold text-slate-950">{info.label}</dt><dd>{info.description}</dd></div>
            ))}
          </dl>
        </details>
      </div>

      <p className="mt-4 text-sm text-slate-700">
        ¿Otra duda? <Link href="/preguntas-frecuentes" className="font-semibold text-[color:var(--accent-strong)] underline-offset-4 hover:underline">Ver preguntas frecuentes</Link>
      </p>
    </section>
  );
}
