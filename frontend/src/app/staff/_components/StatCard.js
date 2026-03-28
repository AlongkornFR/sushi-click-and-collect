export function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="skeleton h-3 w-20 rounded-full" />
      <div className="skeleton mt-3 h-8 w-12 rounded-xl" />
      <div className="skeleton mt-2 h-2.5 w-16 rounded-full" />
    </div>
  );
}

export function ProductRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="skeleton h-14 w-14 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-48 rounded-full" />
        <div className="flex gap-2">
          <div className="skeleton h-3 w-16 rounded-full" />
          <div className="skeleton h-3 w-14 rounded-full" />
        </div>
      </div>
      <div className="hidden shrink-0 space-y-1.5 sm:block">
        <div className="skeleton h-3.5 w-14 rounded-full" />
        <div className="skeleton h-3 w-12 rounded-full" />
      </div>
      <div className="skeleton h-6 w-12 shrink-0 rounded-full" />
      <div className="skeleton h-8 w-20 shrink-0 rounded-xl" />
    </div>
  );
}
