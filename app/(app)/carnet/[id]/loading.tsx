export default function CatchDetailLoading() {
  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-5">
          <div className="h-4 w-16 bg-slate-200 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-20 bg-slate-200 rounded-[8px] animate-pulse" />
            <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
          </div>
        </div>

        {/* Photo */}
        <div className="aspect-[4/3] bg-slate-200 rounded-[22px] mb-4 animate-pulse" />

        {/* Hero card */}
        <div className="bg-white rounded-[22px] border border-slate-100 p-6 shadow-sm mb-4 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-6 w-40 bg-slate-200 rounded" />
              <div className="h-4 w-56 bg-slate-100 rounded" />
              <div className="h-4 w-32 bg-slate-100 rounded" />
            </div>
            <div className="h-6 w-20 bg-slate-100 rounded-full shrink-0" />
          </div>
          {/* Mesures */}
          <div className="flex gap-6 mt-5 pt-5 border-t border-slate-100">
            <div className="space-y-1">
              <div className="h-2 w-8 bg-slate-100 rounded" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
            <div className="space-y-1">
              <div className="h-2 w-8 bg-slate-100 rounded" />
              <div className="h-8 w-16 bg-slate-200 rounded" />
            </div>
          </div>
        </div>

        {/* Section Comment */}
        <div className="bg-white rounded-[14px] border border-slate-100 p-5 shadow-sm mb-4 animate-pulse space-y-3">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-4 bg-slate-100 rounded" />
          <div className="h-4 bg-slate-100 rounded" />
        </div>

        {/* Section Conditions */}
        <div className="bg-white rounded-[14px] border border-slate-100 p-5 shadow-sm animate-pulse">
          <div className="h-3 w-20 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-slate-50 rounded-[10px] p-3">
                <div className="h-2 w-16 bg-slate-200 rounded mb-2" />
                <div className="h-5 w-12 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
