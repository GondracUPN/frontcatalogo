"use client";

import { useState, useEffect } from "react";

type Slide = {
  id: string | number;
  title: string;
  image?: string;
  href?: string;
};

export default function HeroSlider({ slides }: { slides?: Slide[] }) {
  const [index, setIndex] = useState(0);
  const data = slides && slides.length ? slides : [
    { id: 1, title: "Bienvenido a Macsomenos" },
    { id: 2, title: "Tus Apple favoritos" },
    { id: 3, title: "Mejor precio siempre" },
  ];
  const go = (i: number) => setIndex((prev) => (prev + i + data.length) % data.length);
  const set = (i: number) => setIndex(i);

  // Auto-play every 6s
  useEffect(() => {
    const t = setInterval(() => go(1), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {data.map((s) => (
          <div key={s.id} className="min-w-full aspect-[16/6] relative">
            {s.image ? (
              <img src={s.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[#6e6e73]">{s.title}</div>
            )}
            <div className="absolute left-4 bottom-4 bg-black/60 text-white px-3 py-2 rounded-md text-sm max-w-[70%]">
              {s.href ? (<a href={s.href} className="hover:underline">{s.title}</a>) : s.title}
            </div>
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        aria-label="Anterior"
        onClick={() => go(-1)}
        className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
      </button>
      <button
        aria-label="Siguiente"
        onClick={() => go(1)}
        className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 hover:bg-white shadow border border-gray-200 flex items-center justify-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.25 4.5l7.5 7.5-7.5 7.5"/></svg>
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
        {data.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir al slide ${i + 1}`}
            onClick={() => set(i)}
            className={`h-2 w-2 rounded-full ${index === i ? "bg-gray-700" : "bg-gray-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
