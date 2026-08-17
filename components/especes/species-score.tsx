import { getSpeciesRegionalScoreAnon } from '@/lib/especes/score'
import { SpeciesScoreLive } from './species-score-live'

// Score régional PAR ESPÈCE (sprint 23, WS-B) — l'instrument qui rend la fiche vivante.
//
// Sprint 84 : ce composant lisait la session (tier, département, perso) et rendait à
// lui seul les 26 fiches `/especes/[slug]` dynamiques, ce qui vidait leur
// `revalidate = 86400` de tout effet. Il rend désormais la variante ANONYME, calculée
// avec un client Supabase sans cookies, et confie la bascule connectée à
// `SpeciesScoreLive` (client). Le HTML servi est inchangé pour un visiteur sans compte,
// c'est-à-dire pour la totalité du trafic SEO.
//
// La présentation vit dans `species-score-view.tsx`, partagée par les deux chemins :
// il n'existe qu'un seul gabarit, donc aucune divergence possible entre le rendu
// serveur et le rendu après hydratation.

export async function SpeciesScore({
  dbKey,
  article,
  labelLower,
}: {
  dbKey: string
  article: string
  labelLower: string
}) {
  const s = await getSpeciesRegionalScoreAnon(dbKey)

  return (
    <SpeciesScoreLive dbKey={dbKey} initial={s} article={article} labelLower={labelLower} />
  )
}

export function SpeciesScoreSkeleton() {
  return (
    <section className="rounded-[18px] border border-sand-200 bg-white p-5">
      <div className="mb-3 h-3 w-40 rounded bg-sand-200" />
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-full bg-sand-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-sand-200" />
          <div className="h-3 w-44 rounded bg-sand-100" />
        </div>
      </div>
    </section>
  )
}
