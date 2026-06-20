export default function Loading() {
  return (
    <div className="px-3 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="surface-card-strong soft-outline overflow-hidden px-6 py-8 sm:px-8 sm:py-10">
          <div className="max-w-3xl">
            <div className="h-8 w-32 animate-pulse rounded-full bg-white/70" />
            <div className="mt-5 h-12 w-3/4 max-w-xl animate-pulse rounded-full bg-white/75" />
            <div className="mt-4 h-5 w-1/2 max-w-md animate-pulse rounded-full bg-white/60" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="rounded-[30px] border border-white/75 bg-white/80 p-4 shadow-sm">
              <div className="aspect-[4/3] animate-pulse rounded-[24px] bg-slate-100" />
              <div className="mt-4 h-5 w-4/5 animate-pulse rounded-full bg-slate-100" />
              <div className="mt-3 h-7 w-1/2 animate-pulse rounded-full bg-slate-100" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
