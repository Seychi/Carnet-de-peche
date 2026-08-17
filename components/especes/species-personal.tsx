import { SpeciesPersonalLive } from './species-personal-live'

// « Tes tendances sur cette espèce » (sprint 23, WS-B) + highlight « meilleur leurre »
// et « ton record » (sprint 45, WS A/C). Réutilise le moteur perso unifié du sprint 22,
// segmenté par espèce. Descriptif (où/quand/avec quoi tombent TES prises), jamais
// prédictif. États plein/dégradé/vide gérés par PersonalTendencies.
//
// Sprint 84 : la lecture (session + carnet) est sortie du rendu serveur. Elle vivait
// ici et rendait dynamiques les 26 fiches `/especes/[slug]`, alors que ce bloc est
// STRICTEMENT vide pour un visiteur sans compte, c'est-à-dire pour tout le trafic SEO.
// Le serveur rend donc cet état vide (aucun appel base) et `SpeciesPersonalLive`
// (client) va chercher les vraies données après hydratation, via Server Action.

export function SpeciesPersonal({ dbKey, labelLower }: { dbKey: string; labelLower: string }) {
  return <SpeciesPersonalLive dbKey={dbKey} labelLower={labelLower} />
}

export function SpeciesPersonalSkeleton() {
  return (
    <div className="rounded-[18px] border border-sand-200 bg-white p-5">
      <div className="mb-3 h-3 w-40 rounded bg-sand-200" />
      <div className="h-3 w-full rounded bg-sand-100" />
    </div>
  )
}
