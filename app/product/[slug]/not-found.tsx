import Link from "next/link";

export default function ProductNotFound() {
  return <div className="mx-auto max-w-2xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">No encontramos este equipo</h1><p className="mt-3 text-sm text-[color:var(--foreground-soft)]">Es posible que ya no esté publicado. Explora los equipos actuales.</p><Link href="/categorias" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-white">Ver catálogo</Link></div>;
}
