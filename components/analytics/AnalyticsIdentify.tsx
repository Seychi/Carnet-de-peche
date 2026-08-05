'use client'

import { useEffect } from 'react'
import { analytics } from '@/lib/analytics'

/**
 * Rattache les events CLIENT au user_id Supabase (sprint 74, Bloc 4).
 *
 * Pourquoi ça existe : `analytics.identify()` était défini (lib/analytics.ts) mais
 * n'était appelé NULLE PART dans l'app (seulement dans son test). Combiné à
 * `person_profiles: 'identified_only'` (PostHogProvider), ça avait une conséquence
 * silencieuse et coûteuse : les events SERVEUR partaient avec `distinctId = user_id`
 * pendant que les events CLIENT (pageviews, catch_log_started) restaient sur un ID
 * anonyme, sans jamais fusionner. Un utilisateur qui revient à J+7 était donc
 * INVISIBLE dans le funnel, or c'est LA métrique de ce sprint.
 *
 * Monté dans le layout authentifié : chaque visite d'une page connectée (première
 * comme retour) réassocie l'identité. `posthog.identify` est idempotent côté SDK.
 *
 * RGPD : aucun effet sans consentement. Le provider init en `opt_out_capturing_by_default`,
 * et `analytics.identify` no-op tant que PostHog n'est pas chargé. On ne transmet que
 * l'UUID Supabase, jamais l'email ni le pseudo (invariant sprint 26 : zéro PII).
 */
export function AnalyticsIdentify({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return
    analytics.identify(userId)
  }, [userId])

  return null
}
