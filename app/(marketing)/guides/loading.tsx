// Skeleton de chargement pour la liste des guides (page async : lecture
// filesystem des MDX via getAllGuides). Reprend la silhouette de page.tsx :
// hero navy-950 + grille 3 colonnes sur fond sand. Tokens DA v2.
export default function GuidesLoading() {
  return (
    <div>
      {/* Hero navy-950 (silhouette du vrai hero) */}
      <section className="bg-navy-950 pt-16 pb-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="h-3 w-44 rounded bg-white/10" />
          <div className="mt-6 h-9 w-[min(100%,32rem)] rounded bg-white/10" />
          <div className="mt-4 h-5 w-[min(100%,24rem)] rounded bg-white/[0.07]" />
          <div className="mt-6 h-3 w-56 rounded bg-white/[0.07]" />
        </div>
      </section>

      {/* Grille des cartes — 6 placeholders */}
      <section className="bg-sand-50 py-14">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white border border-sand-200 rounded-[18px] overflow-hidden flex flex-col animate-pulse"
              >
                {/* Couverture 16/9 (anti-CLS : même ratio que le vrai visuel) */}
                <div className="aspect-[16/9] bg-sand-100" />
                <div className="p-6 flex flex-col gap-3 flex-1">
                  <div className="flex gap-2">
                    <div className="h-5 w-20 rounded-full bg-sand-100" />
                    <div className="h-5 w-16 rounded-full bg-sand-100" />
                  </div>
                  <div className="h-5 w-3/4 rounded bg-sand-200" />
                  <div className="h-3 w-full rounded bg-sand-100" />
                  <div className="h-3 w-5/6 rounded bg-sand-100" />
                  <div className="flex items-center justify-between pt-3 border-t border-sand-200 mt-auto">
                    <div className="h-3 w-14 rounded bg-sand-100" />
                    <div className="h-3 w-12 rounded bg-sand-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
