import type { FishingWindow } from '@/lib/solunar/types'
import type { PersonalInsight } from './types'

// Seuil à partir duquel un facteur de la fenêtre est considéré « favorable »
const FAVORABLE_FACTOR_THRESHOLD = 0.7

/**
 * Trouve l'insight personnel le plus pertinent pour une fenêtre de pêche.
 *
 * Logique : si la fenêtre présente des conditions favorables sur un facteur
 * (vent ou marée, score > 0.7) ET que l'utilisateur a un insight positif sur
 * ce même facteur, on remonte cet insight. En cas de match multiple, on garde
 * le plus significatif (catchRate le plus élevé).
 */
export function findRelevantInsight(
  window: FishingWindow,
  insights: PersonalInsight[]
): PersonalInsight | null {
  if (insights.length === 0) return null

  const candidates: PersonalInsight[] = []

  if (window.factors.wind > FAVORABLE_FACTOR_THRESHOLD) {
    const windInsight = insights.find(i => i.factor === 'wind' && i.isPositive)
    if (windInsight) candidates.push(windInsight)
  }

  if (window.factors.tide > FAVORABLE_FACTOR_THRESHOLD) {
    const tideInsight = insights.find(i => i.factor === 'tide' && i.isPositive)
    if (tideInsight) candidates.push(tideInsight)
  }

  if (candidates.length === 0) return null

  return candidates.reduce((best, c) => (c.catchRate > best.catchRate ? c : best))
}
