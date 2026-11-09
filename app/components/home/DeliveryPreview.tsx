import Image from "next/image";
import Link from "next/link";
import type { ClientPurchase } from "@/app/actions";

export default function DeliveryPreview({ items }: { items: ClientPurchase[] }) {
  if (!items.length) return null;
  return <section aria-labelledby="delivery-preview-title" className="px-4 pt-10 sm:px-6 sm:pt-14">
    <div className="mx-auto grid max-w-7xl items-center gap-5 rounded-[24px] bg-white p-5 sm:p-7 md:grid-cols-2">
      <div>
        <h2 id="delivery-preview-title" className="text-2xl font-semibold tracking-tight">Clientes que ya compraron en Macsomenos</h2>
        <p className="mt-2 text-[color:var(--foreground-soft)]">Conoce algunas de nuestras entregas reales en Lima.</p>
        <Link href="/clientes" className="mt-3 inline-flex min-h-11 items-center font-semibold text-[color:var(--accent-strong)] hover:underline">Ver entregas realizadas →</Link>
      </div>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {items.map((item) => <li key={item.id} className="min-w-0"><Link href="/clientes" aria-label={`Ver entregas: ${item.productTitle}`} className="relative block aspect-[4/5] overflow-hidden rounded-2xl"><Image src={item.photoUrl} alt={`Entrega de ${item.productTitle}`} fill sizes="(min-width: 768px) 180px, 27vw" className="object-cover" /></Link></li>)}
      </ul>
    </div>
  </section>;
}
