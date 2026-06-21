// Skeleton instantané pour TOUTES les routes /onboarding ([step] ET fini).
// Next le peint dès le router.push → l'INP perçu (interaction → 1re peinture)
// devient quasi-instantané au lieu d'attendre le waterfall RSC (BUG-12).
// Server Component statique, aucune requête.
export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-sand-50 flex flex-col">
      <header className="px-5 pt-6 pb-4 max-w-[520px] mx-auto w-full">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
            CHARGEMENT…
          </span>
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-sand-200" />
          ))}
        </div>
      </header>
      <main className="flex-1 px-5 py-6 max-w-[520px] mx-auto w-full">
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-8 w-2/3 rounded-[10px] bg-sand-200" />
          <div className="h-4 w-full rounded-[8px] bg-sand-200" />
          <div className="h-[52px] w-full rounded-[12px] bg-sand-200" />
          <div className="h-[52px] w-full rounded-full bg-sand-200" />
        </div>
      </main>
    </div>
  )
}
