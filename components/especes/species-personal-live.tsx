'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PersonalTendencies as Tendencies } from '@/lib/scoring/personal/types'
import { confidence, PERSONAL_CONFIG } from '@/lib/scoring/personal/config'
import { fetchViewerSpeciesPersonal } from '@/app/actions/species-insights'
import { SpeciesPersonalView, type SpeciesRecord } from './species-personal-view'

/**
 * Bloc « tes tendances sur cette espèce », auth-aware SANS rendre la fiche dynamique
 * (sprint 84).
 *
 * Avant, ce bloc lisait `auth.getUser()` puis le carnet dans le rendu SERVEUR : c'est
 * l'une des raisons pour lesquelles les 26 fiches `/especes/[slug]` étaient dynamiques
 * malgré `revalidate = 86400`. Le serveur rend maintenant l'état VIDE, qui est
 * exactement ce qu'un visiteur sans compte voyait déjà (moteur perso appelé sans
 * session → `sampleCount = 0` → invitation à loguer). Après hydratation, un connecté
 * récupère ses vraies tendances et son record via la Server Action.
 *
 * 🔒 Invariant central du sprint : aucune donnée de carnet ne peut entrer dans le HTML
 * mis en cache, puisque le serveur ne lit plus jamais la session ici. L'état initial
 * est construit localement, sans le moindre appel réseau.
 */

const EMPTY_RECORD: SpeciesRecord = { sizeCm: null, measuredCm: null, weightG: null }

export function SpeciesPersonalLive({
  dbKey,
  labelLower,
}: {
  dbKey: string
  labelLower: string
}) {
  // État vide reconstruit à l'identique de `empty()` dans lib/scoring/personal/fetch,
  // à partir des sous-modules client-safe. C'est la variante anonyme, donc celle qui
  // est rendue côté serveur et mise en cache.
  const emptyTendencies = useMemo<Tendencies>(
    () => ({
      species: dbKey,
      spotId: null,
      sampleCount: 0,
      confidence: confidence(0),
      tendencies: [],
      hasEnough: false,
      minToUnlock: PERSONAL_CONFIG.MIN_FOR_TENDENCIES,
    }),
    [dbKey],
  )

  const [data, setData] = useState<Tendencies>(emptyTendencies)
  const [record, setRecord] = useState<SpeciesRecord>(EMPTY_RECORD)

  useEffect(() => {
    let active = true
    fetchViewerSpeciesPersonal(dbKey)
      .then((viewer) => {
        // `null` = visiteur anonyme : on garde l'état vide déjà rendu.
        if (!active || !viewer) return
        setData(viewer.tendencies)
        setRecord(viewer.record)
      })
      .catch(() => {
        // Action indisponible : on reste sur l'état vide. Pas de rejet non capturé.
      })
    return () => {
      active = false
    }
  }, [dbKey])

  return <SpeciesPersonalView data={data} record={record} labelLower={labelLower} />
}
