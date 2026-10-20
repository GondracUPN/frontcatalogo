import type { Metadata } from "next";
import Link from "next/link";
import { CookiePreferencesButton } from "../components/CookieConsent";

export const metadata: Metadata = {
  title: "Política de cookies",
  description: "Qué cookies y almacenamiento local usa Macsomenos, para qué sirven y cómo cambiar tu decisión.",
  alternates: { canonical: "/cookies" },
};

type Row = { name: string; type: string; purpose: string; duration: string; provider: string };

const SECTIONS: Array<{ title: string; note: string; rows: Row[] }> = [
  {
    title: "Necesarias",
    note: "Siempre activas: sin ellas no funcionan el carrito, las ofertas ni el panel interno.",
    rows: [
      { name: "ms_consent", type: "Cookie", purpose: "Guarda tu elección sobre cookies, la versión del aviso y la fecha.", duration: "180 días", provider: "Macsomenos" },
      { name: "cart_id, cart_items_cache", type: "Cookie y almacenamiento local", purpose: "Identifican tu carrito y muestran su contenido rápidamente.", duration: "30 días", provider: "Macsomenos" },
      { name: "Sesión de la API (connect.sid)", type: "Cookie", purpose: "Mantiene el carrito asociado en el servidor.", duration: "30 días", provider: "Macsomenos" },
      { name: "fp, offer_state_*, offer_block_*, offer_attempts_*", type: "Cookie y almacenamiento local", purpose: "Limitan los intentos de oferta por producto. fp es un identificador aleatorio, no una huella del dispositivo.", duration: "fp: 30 días; offer_*: 1 año", provider: "Macsomenos" },
      { name: "macsomenos:compare", type: "Almacenamiento local", purpose: "Recuerda los equipos que elegiste comparar.", duration: "Hasta que lo borres", provider: "Macsomenos" },
      { name: "token", type: "Cookie (httpOnly)", purpose: "Inicio de sesión del panel interno. Solo para personal autorizado.", duration: "7 días", provider: "Macsomenos" },
    ],
  },
  {
    title: "Analíticas",
    note: "Solo con tu permiso. Nos ayudan a saber qué productos interesan más. Sin tu permiso solo contamos visitas y clics de forma agregada, sin guardar nada en tu navegador ni identificarte.",
    rows: [
      { name: "ms_visitor, ms_session", type: "Almacenamiento local y de sesión", purpose: "Identificadores aleatorios para estimar visitantes únicos y sesiones (30 minutos de inactividad). No identifican a la persona.", duration: "ms_session: la sesión; ms_visitor: hasta que retires el permiso", provider: "Macsomenos" },
      { name: "catalog_view_session_id, catalog_view_seen_*", type: "Almacenamiento local", purpose: "Identificador aleatorio para contar visitas a productos sin duplicarlas.", duration: "Hasta que retires el permiso", provider: "Macsomenos" },
    ],
  },
  {
    title: "Preferencias",
    note: "Actualmente no usamos cookies de esta categoría.",
    rows: [],
  },
  {
    title: "Marketing",
    note: "Solo con tu permiso. Miden si un anuncio terminó en un contacto por WhatsApp.",
    rows: [
      { name: "_gcl_*", type: "Cookie", purpose: "Etiqueta de Google Ads para medir conversiones de anuncios.", duration: "Según Google (hasta 90 días)", provider: "Google" },
    ],
  },
];

export default function CookiesPage() {
  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-4xl">
        <div className="surface-card-strong soft-outline px-5 py-6 sm:px-8 sm:py-8">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">Privacidad</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">Política de cookies</h1>
          <p className="mt-3 text-sm leading-6 text-[color:var(--foreground-soft)] sm:text-base">
            Esta página explica qué cookies y qué datos de almacenamiento local usa esta web. Las categorías opcionales
            permanecen desactivadas hasta que las aceptes, y puedes cambiar o retirar tu decisión en cualquier momento.
          </p>
          <CookiePreferencesButton className="mt-5 min-h-11 rounded-full bg-[color:var(--foreground)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90" />

          <div className="mt-8 space-y-8">
            {SECTIONS.map((section) => (
              <section key={section.title}>
                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">{section.title}</h2>
                <p className="mt-1 text-sm text-[color:var(--foreground-soft)]">{section.note}</p>
                {section.rows.length > 0 && (
                  <ul className="mt-3 space-y-3">
                    {section.rows.map((row) => (
                      <li key={row.name} className="rounded-2xl border border-black/8 bg-white p-4">
                        <div className="break-words font-mono text-sm font-semibold text-[color:var(--foreground)]">{row.name}</div>
                        <p className="mt-1 text-sm leading-6 text-[color:var(--foreground)]">{row.purpose}</p>
                        <dl className="mt-2 grid grid-cols-1 gap-1 text-xs text-[color:var(--foreground-soft)] sm:grid-cols-3">
                          <div><dt className="inline font-semibold">Tipo: </dt><dd className="inline">{row.type}</dd></div>
                          <div><dt className="inline font-semibold">Duración: </dt><dd className="inline">{row.duration}</dd></div>
                          <div><dt className="inline font-semibold">Proveedor: </dt><dd className="inline">{row.provider}</dd></div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section>
              <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Servicios de terceros</h2>
              <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-soft)]">
                El mapa de la página de contacto (Google Maps) solo se carga si pulsas «Cargar mapa». Los enlaces a WhatsApp
                abren la aplicación de WhatsApp, que aplica sus propias condiciones.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Contacto</h2>
              <p className="mt-1 text-sm leading-6 text-[color:var(--foreground-soft)]">
                Si tienes dudas sobre el uso de tus datos, escríbenos por los canales de la{" "}
                <Link href="/contact" className="text-[color:var(--accent)] underline underline-offset-2">página de contacto</Link>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
