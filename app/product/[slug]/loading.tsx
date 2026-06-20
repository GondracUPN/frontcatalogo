export default function ProductLoading() {
  return (
    <div className="overflow-x-hidden px-2 pb-10 pt-4 sm:px-4 sm:pb-14 sm:pt-6">
      <div className="mx-auto min-w-0 max-w-7xl">
        <section className="surface-card-strong soft-outline overflow-hidden px-3 py-5 sm:px-8 sm:py-10">
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.96fr)_minmax(340px,1.04fr)] lg:items-start lg:gap-8">
            <div className="min-w-0">
              <div className="aspect-[4/3] w-full animate-pulse rounded-[18px] bg-slate-100 sm:rounded-[30px] lg:rounded-[34px]" />
              <div className="mt-3 flex gap-2 overflow-hidden">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-16 w-16 shrink-0 animate-pulse rounded-[14px] bg-slate-100 sm:h-20 sm:w-20" />
                ))}
              </div>
            </div>
            <div className="min-w-0 space-y-4">
              <div className="flex gap-2">
                <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
                <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="h-10 w-3/4 animate-pulse rounded-full bg-slate-100" />
              <div className="rounded-[22px] border border-white/80 bg-white/70 p-5">
                <div className="h-4 w-28 animate-pulse rounded-full bg-slate-100" />
                <div className="mt-4 h-10 w-40 animate-pulse rounded-full bg-slate-100" />
                <div className="mt-5 h-12 w-full animate-pulse rounded-full bg-slate-100" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-20 animate-pulse rounded-[18px] bg-slate-100" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
