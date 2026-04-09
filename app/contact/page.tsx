const PHONE_NUMBER = "976283856";
const WHATSAPP_LINK = "https://wa.me/+51976283856";
const STORAGE_LINK = "https://maps.app.goo.gl/ttGMLJEKx4LEwNet6";
const MAP_EMBED =
  "https://maps.google.com/maps?q=-12.1654307,-76.996673(Macsomenos)&t=&z=20&ie=UTF8&iwloc=&output=embed";

const CONTACT_NOTES = [
  {
    title: "WhatsApp directo",
    text: "Escribenos para stock, precio, separaciones o coordinaciones.",
  },
  {
    title: "Numero de contacto",
    text: PHONE_NUMBER,
  },
  {
    title: "Almacen",
    text: "Jr. Ganimedes 245, Surco",
  },
];

export default function ContactPage() {
  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong soft-outline overflow-hidden px-5 py-6 sm:px-8 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Contacto
                </div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
                  Contacto directo.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--foreground-soft)] sm:text-base">
                  Habla con Macsomenos por WhatsApp o revisa la ubicacion del almacen.
                </p>
              </div>

              <div className="rounded-[26px] border border-black/6 bg-[linear-gradient(145deg,#121826,#24324a_40%,#8192b4_100%)] p-5 text-white shadow-2xl shadow-slate-900/20 sm:p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">WhatsApp</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{PHONE_NUMBER}</div>
                <p className="mt-3 text-sm leading-6 text-white/78">
                  Respuesta directa para consultas comerciales.
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-[#141414] hover:bg-white/90"
                  >
                    Contactar por WhatsApp
                  </a>
                  <a
                    href={STORAGE_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary inline-flex items-center justify-center rounded-full border border-white/22 bg-white/10 px-5 py-3 text-sm font-medium text-white hover:bg-white/14"
                  >
                    Ver almacen
                  </a>
                </div>
              </div>

              <div className="grid gap-3">
                {CONTACT_NOTES.map((card) => (
                  <div key={card.title} className="rounded-[22px] border border-black/6 bg-white/72 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--foreground-soft)]">
                      {card.title}
                    </div>
                    <div className="mt-2 text-base font-medium text-[color:var(--foreground)]">{card.text}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[26px] border border-black/6 bg-white/72 p-3 sm:p-4">
                <div className="mb-3 px-1">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                    Minimapa
                  </div>
                  <div className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
                    Almacen Macsomenos
                  </div>
                </div>

                <div className="overflow-hidden rounded-[22px] border border-black/6 bg-white">
                  <iframe
                    title="Almacen Macsomenos"
                    src={MAP_EMBED}
                    className="h-[320px] w-full sm:h-[380px]"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>

              <div className="rounded-[26px] border border-black/6 bg-[rgba(248,250,252,0.96)] p-4 sm:p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--foreground-soft)]">
                  Ubicacion
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--foreground)]">
                  Puedes abrir la ruta del almacen desde Google Maps con el enlace directo.
                </p>
                <a
                  href={STORAGE_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-medium text-[color:var(--foreground)] hover:bg-[rgba(248,250,252,0.96)]"
                >
                  Abrir en Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
