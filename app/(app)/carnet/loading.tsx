export default function CarnetLoading() {
  return (
    <div className="min-h-screen bg-sand-50">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* En-tête */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-32 bg-slate-200 rounded-[8px] animate-pulse" />
          <div className="hidden sm:block h-9 w-24 bg-slate-200 rounded-[10px] animate-pulse" />
        </div>

        {/* Stats synthétiques — 4 cartes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[14px] border border-slate-100 p-4 shadow-sm animate-pulse"
            >
              <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
              <div className="h-7 w-10 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        {/* Bloc stats détaillées */}
        <div className="bg-white rounded-[14px] border border-slate-100 shadow-sm mb-5 animate-pulse">
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="h-3 w-20 bg-slate-200 rounded" />
            <div className="h-4 w-4 bg-slate-200 rounded" />
          </div>
        </div>

        {/* Filtres */}
        <div className="h-10 bg-white rounded-[12px] border border-slate-100 shadow-sm mb-5 animate-pulse" />

        {/* Grille — 6 cartes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-[22px] border border-slate-100 shadow-sm overflow-hidden animate-pulse"
            >
              {/* Miniature photo */}
              <div className="aspect-[4/3] bg-slate-200" />
              {/* Contenu */}
              <div className="p-4 space-y-2">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-36 bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
