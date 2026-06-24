'use client'

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { readConsent } from '@/lib/consent'

/**
 * Provider PostHog (sprint 26 / D-F1) — mode EU, anonymisé, opt-out par défaut.
 *
 * Garde-fous RGPD :
 *  - N'init QUE si NEXT_PUBLIC_POSTHOG_KEY est présente (sinon entièrement no-op).
 *  - `opt_out_capturing_by_default: true` → AUCUNE capture tant que l'utilisateur
 *    n'a pas accepté via le bandeau (components/consent/CookieBanner).
 *  - `person_profiles: 'identified_only'` → pas de profil pour les anonymes.
 *  - `capture_pageview: false` → pageviews captées manuellement (App Router).
 *  - Au mount, si le cookie de consentement vaut déjà 'granted' → opt_in_capturing().
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return // pas de clé → on ne charge rien
    if (posthog.__loaded) return // déjà initialisé (StrictMode double-mount)

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false,
      capture_pageleave: true,
      opt_out_capturing_by_default: true,
      // Désactivé : on fait de la mesure d'audience, pas du session replay.
      disable_session_recording: true,
      autocapture: false,
    })

    // Si l'utilisateur a déjà consenti lors d'une visite précédente, on réactive.
    if (readConsent() === 'granted') {
      posthog.opt_in_capturing()
    }
  }, [])

  // Sans clé : on rend les enfants tels quels, sans contexte PostHog (no-op).
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
}

/**
 * Capture un '$pageview' à chaque changement de route (App Router : pas
 * d'auto-capture). useSearchParams suspend → enveloppé dans <Suspense>.
 */
export function PostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  )
}

function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!posthog.__loaded) return
    const search = searchParams.toString()
    const url = window.origin + pathname + (search ? `?${search}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}
