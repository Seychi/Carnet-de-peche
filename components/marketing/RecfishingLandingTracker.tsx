'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { analytics } from '@/lib/analytics'

/**
 * Émet l'event 'landing_recfishing_viewed' au montage de la landing SEO
 * « déclarer ses prises » (wedge RecFishing, sprint 73).
 *
 * Respect du consentement : la capture est un no-op tant que l'utilisateur n'a
 * pas accepté le bandeau (PostHog est en opt_out_capturing_by_default, cf
 * components/analytics/PostHogProvider). On ne fait qu'appeler analytics, qui
 * ne pousse rien sans consentement, ni hors navigateur.
 *
 * Attribution : on relaie les paramètres UTM de l'URL (pas de PII). Le composant
 * ne rend rien (doit être enveloppé dans un <Suspense> à cause de useSearchParams).
 */
export function RecfishingLandingTracker() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const utm = {
      utmSource: searchParams.get('utm_source') ?? undefined,
      utmMedium: searchParams.get('utm_medium') ?? undefined,
      utmCampaign: searchParams.get('utm_campaign') ?? undefined,
    }
    // On n'inclut que les clés réellement présentes (event propre).
    const props = Object.fromEntries(
      Object.entries(utm).filter(([, v]) => v != null),
    )
    analytics.landingRecfishingViewed(props)
    // Une seule fois au montage : l'attribution UTM est fixée à l'arrivée.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
