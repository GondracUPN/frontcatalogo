"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert" className="mx-auto max-w-2xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">No pudimos cargar esta página</h1><p className="mt-3 text-sm text-[color:var(--foreground-soft)]">El servicio puede estar temporalmente inaccesible. Intenta de nuevo o vuelve al catálogo.</p><div className="mt-6 flex justify-center gap-3"><button type="button" onClick={reset} className="min-h-11 rounded-full bg-[color:var(--accent)] px-5 text-sm font-semibold text-white">Reintentar</button><Link href="/categorias" className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--border)] bg-white px-5 text-sm font-semibold">Ver categorías</Link></div></div>;
}
