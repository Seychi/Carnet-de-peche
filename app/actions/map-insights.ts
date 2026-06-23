'use server'

import { getUserTier } from '@/lib/auth/tier'
import { getPersonalTendencies } from '@/lib/scoring/personal'
import type { PersonalTendencies } from '@/lib/scoring/personal'

export type MapScoreResult =
  | { gated: true }
  | { gated: false; tendencies: PersonalTendencies }

/**
 * Tendances perso pour la couche « Ton score » de la carte (Carte v2 / C1).
 * 🔒 GATING SERVEUR via current_tier (jamais côté client) : réservé Local/Itinérant
 * SUR LA CARTE (décision inchangée). Le bloc perso de la FICHE SPOT, lui, est gratuit
 * (D-A1). Honnête : tendances DESCRIPTIVES calculées sur les vraies prises de l'user
 * (vue catches_for_viewer, uid serveur), jamais un score fabriqué.
 */
export async function getMapScoreInsights(): Promise<MapScoreResult> {
  const tier = await getUserTier()
  if (tier !== 'local' && tier !== 'itinerant') return { gated: true }
  const tendencies = await getPersonalTendencies()
  return { gated: false, tendencies }
}
