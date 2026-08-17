'use client'

import { useEffect, useState } from 'react'
import type { SpeciesScore } from '@/lib/especes/score'
import { fetchViewerSpeciesScore } from '@/app/actions/species-insights'
import { SpeciesScoreView } from './species-score-view'

/**
 * Score par espèce, auth-aware SANS rendre la fiche dynamique (sprint 84).
 *
 * Le serveur rend la variante ANONYME (`initial`, périmètre national, communauté
 * seule) : c'est ce HTML qui part au CDN et chez Googlebot, et c'est exactement ce
 * qu'un visiteur sans compte voyait déjà. Après hydratation, si une session existe,
 * la Server Action recalcule le score dans le périmètre du pêcheur (son département)
 * avec sa composante perso, et le bloc se met à jour. Même pattern que
 * `components/layout/HeaderAuthSlot.tsx` et `components/marketing/HeroPrimaryCta.tsx`.
 *
 * 🔒 Invariant : `initial` ne contient jamais de donnée de visiteur (il est produit
 * par un client Supabase sans cookies), donc rien de personnel ne peut se retrouver
 * dans le HTML mis en cache ni dans le payload RSC de la page.
 *
 * Aucun état de chargement : on n'affiche pas de squelette par-dessus une donnée déjà
 * juste. Un anonyme ne voit jamais rien bouger ; un connecté voit le périmètre se
 * resserrer une fois, sans décalage de hauteur notable (même gabarit des deux côtés).
 */
export function SpeciesScoreLive({
  dbKey,
  initial,
  article,
  labelLower,
}: {
  dbKey: string
  initial: SpeciesScore
  article: string
  labelLower: string
}) {
  const [score, setScore] = useState<SpeciesScore>(initial)

  useEffect(() => {
    let active = true
    fetchViewerSpeciesScore(dbKey)
      .then((viewer) => {
        // `null` = visiteur anonyme : on garde la variante déjà rendue.
        if (active && viewer) setScore(viewer)
      })
      .catch(() => {
        // Action indisponible (réseau, déploiement en cours) : la variante anonyme
        // reste affichée. Jamais de rejet non capturé sur une page publique.
      })
    return () => {
      active = false
    }
  }, [dbKey])

  return <SpeciesScoreView s={score} article={article} labelLower={labelLower} />
}
