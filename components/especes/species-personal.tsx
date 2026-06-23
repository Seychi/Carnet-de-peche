import { getPersonalTendencies } from '@/lib/scoring/personal/fetch'
import { PersonalTendencies } from '@/components/scoring/PersonalTendencies'

// « Tes tendances sur cette espèce » (sprint 23, WS-B) — réutilise le moteur perso
// unifié du sprint 22, segmenté par espèce. Descriptif (où/quand tombent TES prises),
// jamais prédictif. États plein/dégradé/vide gérés par le composant.
export async function SpeciesPersonal({ dbKey, labelLower }: { dbKey: string; labelLower: string }) {
  const data = await getPersonalTendencies({ species: dbKey })
  return <PersonalTendencies data={data} speciesLabel={labelLower} />
}

export function SpeciesPersonalSkeleton() {
  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-5">
      <div className="mb-3 h-3 w-40 rounded bg-sand-200" />
      <div className="h-3 w-full rounded bg-sand-100" />
    </div>
  )
}
