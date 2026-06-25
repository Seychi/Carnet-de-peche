import { PLAN_PRICING } from '@/lib/stripe/pricing'

// Logique PURE et config de la home (sprint 34, WS-2) — sans aucun import serveur
// (pas de next/headers, pas de Supabase), donc testable en isolation. Le wrapper
// serveur (`home-data.ts`) réutilise ces briques. Même découpage que near-you / -core.

/**
 * Classe des spots par `day_score` décroissant (spot sans score → fin de liste).
 * Déterministe : sert à choisir un hero attractif ET stable. Pur et testable.
 * `dayScoreOf` découple la source du score (évite l'invariance des `Map` en TS).
 */
export function rankByDayScore<T extends { id: string }>(
  spots: T[],
  dayScoreOf: (id: string) => number | null,
): T[] {
  return [...spots].sort((a, b) => (dayScoreOf(b.id) ?? -1) - (dayScoreOf(a.id) ?? -1))
}

export type HomeTier = {
  id: 'discovery' | 'local' | 'itinerant'
  name: string
  monthly: string
  period: string
  /** Prix annuel (−17 %), ou null pour le gratuit. */
  annual: string | null
  highlight: boolean
}

// Tarifs de la home — source de vérité des montants = lib/stripe/pricing.
export const HOME_TIERS: HomeTier[] = [
  {
    id: 'discovery',
    name: 'Découverte',
    monthly: '0 €',
    period: 'pour toujours',
    annual: null,
    highlight: false,
  },
  {
    id: 'local',
    name: 'Local',
    monthly: PLAN_PRICING.local.monthly.amount,
    period: PLAN_PRICING.local.monthly.period,
    annual: PLAN_PRICING.local.annual.amount,
    highlight: true,
  },
  {
    id: 'itinerant',
    name: 'Itinérant',
    monthly: PLAN_PRICING.itinerant.monthly.amount,
    period: PLAN_PRICING.itinerant.monthly.period,
    annual: PLAN_PRICING.itinerant.annual.amount,
    highlight: false,
  },
]
