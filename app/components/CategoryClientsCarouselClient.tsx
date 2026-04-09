"use client";

import { useMemo, useState } from "react";

type Props = {
  images: string[];
};

const WATERMARK_SRC = "/clientes/logo.png";

export default function CategoryClientsCarouselClient({ images }: Props) {
  const [index, setIndex] = useState(0);
  const count = images.length;
  const canLoop = count > 0;

  const visible = useMemo(() => {
    if (!canLoop) return ["", "", ""];
    const getAt = (offset: number) => {
      const i = (index + offset + count) % count;
      return images[i];
    };
    return [getAt(0), getAt(1), getAt(2)];
  }, [canLoop, count, images, index]);

  if (!images.length) {
    return (
      <div className="rounded-[26px] border border-dashed border-black/10 bg-white/70 p-6 text-center text-sm text-[color:var(--foreground-soft)]">
        No hay clientes disponibles.
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Anterior"
        onClick={() => setIndex((v) => (v - 1 + count) % count)}
        className="absolute -left-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/85 shadow-lg backdrop-blur-xl"
      >
        <span className="text-lg text-[color:var(--foreground)]">{`<`}</span>
      </button>
      <div className="flex flex-nowrap gap-4 pb-2">
        {visible.map((src, idx) => (
          <div
            key={`${src}-${idx}`}
            className="overflow-hidden rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(239,244,250,0.92))] shadow-[0_18px_40px_rgba(15,23,42,0.08)] shrink-0 w-[48%] sm:w-[32%]"
          >
            <div className="aspect-[3/4] relative bg-[linear-gradient(145deg,#eff3f7,#dfe7f1)]">
              <img src={src} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-transparent to-white/14" />
              <img
                src={WATERMARK_SRC}
                alt=""
                className="pointer-events-none absolute inset-0 m-auto w-[58%] max-w-[220px] select-none opacity-45"
              />
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label="Siguiente"
        onClick={() => setIndex((v) => (v + 1) % count)}
        className="absolute -right-2 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/85 shadow-lg backdrop-blur-xl"
      >
        <span className="text-lg text-[color:var(--foreground)]">{`>`}</span>
      </button>
    </div>
  );
}
