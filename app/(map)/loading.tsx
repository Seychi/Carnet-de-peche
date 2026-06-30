// Placeholder carte — remplit le <main flex-1 min-h-0> du layout (map), anti
// blank-flash pendant les fetchs SSR (tier → profil → spots → scores). Pas de
// min-h-screen (layout en h-dvh overflow-hidden). Sprint 54 WS-B.
export default function MapLoading() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-navy-950">
      <div className="absolute inset-0 animate-pulse bg-navy-900/40" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-white/50">
          Chargement de la carte…
        </p>
      </div>
    </div>
  )
}
