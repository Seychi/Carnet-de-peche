// Skeleton générique du groupe (app) pour les pages sans loading dédié. Rendu dans
// le <main> du shell → header/sidebar/tab bar restent visibles, anti blank-flash.
// animate-pulse est neutralisé sous prefers-reduced-motion (globals.css). Sprint 54 WS-B.
export default function AppLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 h-7 w-40 animate-pulse rounded-[8px] bg-slate-200" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[14px] border border-slate-100 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 h-3 w-16 rounded bg-slate-200" />
            <div className="h-7 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-[14px] border border-slate-100 bg-white shadow-sm"
          />
        ))}
      </div>
    </div>
  )
}
