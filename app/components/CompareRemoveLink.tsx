"use client";

import Link from "next/link";

export default function CompareRemoveLink({ slug, remaining }: { slug: string; remaining: string[] }) {
  return <Link href={`/comparar?items=${encodeURIComponent(remaining.join(","))}`} onClick={() => { try { window.localStorage.setItem("macsomenos:compare", JSON.stringify(remaining)); } catch {} }} className="mt-2 inline-block text-xs underline" aria-label={`Quitar ${slug} de la comparación`}>Quitar</Link>;
}
