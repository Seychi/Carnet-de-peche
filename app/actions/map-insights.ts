'use server'

import { getUserTier } from '@/lib/auth/tier'
import { getMyCatchInsights } from '@/lib/catches/insights'
import type { PersonalInsightsResult } from '@/lib/catches/insights'

export type MapScoreResult =
  | { gated: true }
  | { gated: false; insights: PersonalInsightsResult | null }

/**
 * Insights perso pour la couche « Ton score » de la carte (Carte v2 / C1, Bloc D).
 * 🔒 GATING SERVEUR via current_tier (jamais côté client) : réservé Local/Itinérant.
 * Honnête : renvoie les tendances DESCRIPTIVES déjà calculées (lib/catches/insights),
 * jamais un score fabriqué. Si l'historique ne suffit pas, insights.totalCount === 0
 * → l'UI invite à loguer plutôt qu'inventer.
 */
export async function getMapScoreInsights(): Promise<MapScoreResult> {
  const tier = await getUserTier()
  if (tier !== 'local' && tier !== 'itinerant') return { gated: true }
  const insights = await getMyCatchInsights().catch(() => null)
  return { gated: false, insights }
}
