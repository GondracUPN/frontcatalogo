import type { Metadata } from "next";
import Link from "next/link";
import { getClientPurchases } from "../actions";
import { ClientDeliveriesGallery } from "../components/ClientDeliveries";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Clientes y equipos entregados",
  description: "Fotos de entregas reales de Macsomenos con el equipo Apple que compró cada cliente.",
  alternates: { canonical: "/clientes" },
};

export default async function ClientesPage() {
  const items = await getClientPurchases();
  return (
    <div className="px-4 pb-16 pt-4 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Ruta" className="text-sm text-[color:var(--foreground-soft)]">
          <Link href="/" className="hover:text-[color:var(--foreground)]">Inicio</Link> / <span aria-current="page">Clientes</span>
        </nav>
        <header className="mt-6 flex flex-wrap items-end justify-between gap-6 sm:mt-10">
          <div className="max-w-3xl">
            <p className="text-[15px] font-semibold text-[color:var(--accent-strong)]">Entregas reales</p>
            <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-[color:var(--foreground)] sm:text-[52px]">Clientes que ya compraron</h1>
            <p className="mt-4 max-w-[56ch] text-[17px] leading-relaxed text-[color:var(--foreground-soft)] sm:text-lg">
              Cada foto corresponde a una entrega de Macsomenos. Debajo verás el equipo que se llevó el cliente. Toca una foto para ampliarla.
            </p>
          </div>
          {items.length > 0 && <p className="text-sm text-[color:var(--foreground-soft)]">{items.length === 1 ? "1 entrega publicada" : `${items.length} entregas publicadas`}</p>}
        </header>
        <div className="mt-8 sm:mt-10">
          <ClientDeliveriesGallery items={items} />
        </div>
      </div>
    </div>
  );
}
