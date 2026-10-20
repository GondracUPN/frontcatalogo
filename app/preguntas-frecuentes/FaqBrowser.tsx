"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FaqItem, FaqTopic } from "@/lib/help-content";

const normalize = (value: string) => value.toLocaleLowerCase("es").normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Respuesta desplegable. Se reutiliza en la portada. */
export function FaqEntry({ item, defaultOpen = false, open, onToggle }: { item: FaqItem; defaultOpen?: boolean; open?: boolean; onToggle?: (open: boolean) => void }) {
  return (
    <details
      id={item.id}
      open={open ?? defaultOpen}
      onToggle={onToggle ? (event) => onToggle((event.currentTarget as HTMLDetailsElement).open) : undefined}
      className="ms-faq group border-b border-[color:var(--border)] last:border-b-0"
    >
      <summary className="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-semibold leading-snug text-[color:var(--foreground)] outline-none hover:text-[color:var(--accent-strong)] focus-visible:rounded-xl focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] [&::-webkit-details-marker]:hidden">
        {item.question}
        <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-tint)] text-xl leading-none text-[color:var(--accent)] transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">+</span>
      </summary>
      <div className="max-w-[68ch] space-y-2 pb-5 pr-10 text-base leading-relaxed text-[color:var(--foreground-soft)]">
        {item.answer.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {item.link && (
          <p><Link href={item.link.href} {...(/^https?:/.test(item.link.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="font-semibold text-[color:var(--accent-strong)] underline-offset-4 hover:underline">{item.link.label} →</Link></p>
        )}
      </div>
    </details>
  );
}

export default function FaqBrowser({ items, topics }: { items: FaqItem[]; topics: FaqTopic[] }) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("todos");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  // Un enlace a /preguntas-frecuentes#igv abre directamente esa respuesta,
  // también si la página ya estaba abierta con un tema o una búsqueda.
  useEffect(() => {
    const openFromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || !items.some((item) => item.id === id)) return;
      setQuery("");
      setTopic("todos");
      setOpenIds(new Set([id]));
      requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [items]);

  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const visible = useMemo(
    () => items.filter((item) => {
      if (topic !== "todos" && item.topic !== topic) return false;
      if (!terms.length) return true;
      const haystack = normalize(`${item.question} ${item.answer.join(" ")}`);
      return terms.every((term) => haystack.includes(term));
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, topic, terms.join(" ")],
  );
  const searching = terms.length > 0;
  const groups = topics
    .map((group) => ({ ...group, items: visible.filter((item) => item.topic === group.id) }))
    .filter((group) => group.items.length);

  const toggle = (id: string, open: boolean) => setOpenIds((current) => {
    if (current.has(id) === open) return current;
    const next = new Set(current);
    if (open) next.add(id); else next.delete(id);
    return next;
  });

  return (
    <div>
      <label htmlFor="faq-search" className="sr-only">Buscar en preguntas frecuentes</label>
      <div className="flex min-h-14 items-center gap-3 rounded-full border border-[color:var(--border)] bg-white px-5 focus-within:border-[color:var(--accent)] focus-within:ring-2 focus-within:ring-[color:var(--accent-soft)]">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0 fill-none stroke-[color:var(--foreground-soft)] stroke-2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
        <input
          id="faq-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca: batería, IGV, garantía, entrega…"
          autoComplete="off"
          // Los estilos globales de input (borde y anillo) no aplican: el anillo lo dibuja el contenedor.
          style={{ border: 0, background: "transparent", boxShadow: "none", borderRadius: 0, outline: "none" }}
          className="min-h-12 min-w-0 flex-1 rounded-none border-0 bg-transparent p-0 text-base text-[color:var(--foreground)] shadow-none outline-none placeholder:text-[color:var(--foreground-soft)] focus:shadow-none"
        />
        {query && <button type="button" onClick={() => setQuery("")} className="min-h-10 rounded-full px-3 text-sm font-semibold text-[color:var(--accent-strong)] hover:bg-[color:var(--brand-tint)]">Borrar</button>}
      </div>

      <div role="group" aria-label="Filtrar por tema" className="ms-shelf -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {[{ id: "todos", label: "Todas" }, ...topics].map((option) => {
          const active = topic === option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => setTopic(option.id)}
              className={`min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold transition-colors ${active ? "bg-[color:var(--foreground)] text-white" : "bg-white text-[color:var(--foreground)] hover:bg-[color:var(--brand-tint)]"}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p aria-live="polite" className="mt-6 text-sm text-[color:var(--foreground-soft)]">
        {visible.length === 1 ? "1 respuesta" : `${visible.length} respuestas`}{searching ? ` para «${query.trim()}»` : ""}
      </p>

      {groups.length ? (
        <div className="mt-2 space-y-8">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={`tema-${group.id}`}>
              <h2 id={`tema-${group.id}`} className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[color:var(--accent-strong)]">{group.label}</h2>
              <div className="mt-2 rounded-[24px] bg-white px-5 sm:px-7">
                {group.items.map((item) => (
                  <FaqEntry key={item.id} item={item} open={searching ? true : openIds.has(item.id)} onToggle={(open) => !searching && toggle(item.id, open)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-[24px] bg-white p-7">
          <p className="text-[17px] font-semibold">No encontramos una respuesta para «{query.trim()}».</p>
          <p className="mt-2 text-[color:var(--foreground-soft)]">Prueba con otra palabra o escríbenos: respondemos por WhatsApp.</p>
          <button type="button" onClick={() => { setQuery(""); setTopic("todos"); }} className="mt-4 min-h-11 rounded-full bg-[color:var(--brand-tint)] px-5 font-semibold text-[color:var(--accent-strong)]">Ver todas las preguntas</button>
        </div>
      )}
    </div>
  );
}
