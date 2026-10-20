import type { Metadata } from "next";
import Link from "next/link";
import FaqBrowser from "./FaqBrowser";
import { FAQ_ITEMS, FAQ_TOPICS, WAREHOUSE_ADDRESS } from "@/lib/help-content";
import { whatsappUrl } from "@/lib/store-config";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Cómo comprar en Macsomenos: estado de los equipos, batería, garantía, precios con IGV, métodos de pago y entregas en Lima.",
  alternates: { canonical: "/preguntas-frecuentes" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer.join(" ") },
  })),
};

export default function PreguntasFrecuentesPage() {
  const whatsapp = whatsappUrl("Hola Macsomenos, tengo una consulta antes de comprar.");
  return (
    <div className="px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Ruta" className="text-sm text-[color:var(--foreground-soft)]">
          <Link href="/" className="hover:text-[color:var(--foreground)]">Inicio</Link> / <span aria-current="page">Preguntas frecuentes</span>
        </nav>

        <header className="mt-6 max-w-3xl sm:mt-10">
          <p className="text-[15px] font-semibold text-[color:var(--accent-strong)]">Ayuda para comprar</p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-[52px]">Preguntas frecuentes</h1>
          <p className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-[color:var(--foreground-soft)] sm:text-lg">
            Cómo se solicita un equipo, qué significa cada estado y qué incluye el precio. Si tu duda es sobre una unidad concreta, escríbenos desde su ficha.
          </p>
        </header>

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
          <FaqBrowser items={FAQ_ITEMS} topics={FAQ_TOPICS} />

          <aside aria-labelledby="faq-help-title" className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[24px] bg-[color:var(--foreground)] p-7 text-white">
              <h2 id="faq-help-title" className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">¿No está tu pregunta?</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/85">Envíanos el modelo o el código del equipo y te respondemos sobre esa unidad.</p>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-5 font-semibold text-[color:var(--foreground)] hover:bg-[color:var(--brand-tint)]">
                Escribir por WhatsApp
              </a>
              <p className="mt-5 border-t border-white/15 pt-4 text-sm leading-relaxed text-white/80">Almacén: {WAREHOUSE_ADDRESS}. Recojo gratuito coordinado por WhatsApp.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
