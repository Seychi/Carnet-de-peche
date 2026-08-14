// Squelette du flow « Loguer » (sprint 77, Bloc 7). La route est sortie du
// groupe (app), elle ne bénéficie donc plus de app/(app)/carnet/loading.tsx :
// sans ce fichier, le clic sur « Loguer » resterait sans retour visuel le temps
// de charger le spot et la boîte à matériel.
export default function NouvellePriseLoading() {
  return (
    <div className="min-h-screen bg-sand-50">
      <header className="sticky top-0 z-40 bg-navy-950 text-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <span className="font-display text-[17px] font-semibold text-white">Nouvelle prise</span>
        </div>
      </header>
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="h-16 animate-pulse rounded-[14px] bg-slate-200" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[22px] border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 h-3 w-24 rounded bg-slate-200" />
            <div className="h-10 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
