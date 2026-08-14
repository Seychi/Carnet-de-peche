'use client'

import { useEffect, useRef, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { readConsent } from '@/lib/consent'
import { readEntryAttribution, rememberEntryAttribution } from '@/lib/analytics/attribution'

/**
 * Provider PostHog (sprint 26 / D-F1) — mode EU, anonymisé, opt-out par défaut.
 *
 * Garde-fous RGPD (INCHANGÉS au sprint 76) :
 *  - N'init QUE si NEXT_PUBLIC_POSTHOG_KEY est présente (sinon entièrement no-op).
 *  - `opt_out_capturing_by_default: true` → AUCUNE capture tant que l'utilisateur
 *    n'a pas accepté via le bandeau (components/consent/CookieBanner).
 *  - `person_profiles: 'identified_only'` → pas de profil pour les anonymes.
 *  - `capture_pageview: false` → pageviews captées manuellement (App Router).
 *  - Au mount, si le cookie de consentement vaut déjà 'granted' → opt_in_capturing().
 *
 * Sprint 76, Bloc 7 : l'init a quitté le `useEffect` du provider pour le RENDU.
 * React exécute les effets des ENFANTS avant ceux du parent : `PageViewTracker`
 * testait `posthog.__loaded` avant que l'init du parent n'ait tourné, et le tout
 * premier `$pageview` de chaque chargement était perdu en silence. L'appel reste
 * idempotent et se produit au même instant du cycle de vie (chargement de page),
 * donc le comportement réseau vis-à-vis du consentement est inchangé.
 * Détail et preuve : docs/sprint-76/research/attribution.md
 */
function ensurePostHogInit(): boolean {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return false
  if (typeof window === 'undefined') return false
  if (posthog.__loaded) return true

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
  return true
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Mémorise la source d'entrée AVANT toute capture. N'émet rien : simple
  // écriture sessionStorage, licite sans consentement (cf attribution.ts).
  if (typeof window !== 'undefined') {
    rememberEntryAttribution()
    ensurePostHogInit()
  }

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
  // Le PREMIER pageview capturé de la session porte la source d'entrée : sans
  // ça, PostHog lit `document.referrer` au moment de la capture, qui vaut
  // souvent une page interne (42 % d'auto-référencement mesurés le 13/08).
  const firstCaptureDone = useRef(false)

  useEffect(() => {
    if (!posthog.__loaded) return
    const search = searchParams.toString()
    const url = window.origin + pathname + (search ? `?${search}` : '')
    const props: Record<string, unknown> = { $current_url: url }
    if (!firstCaptureDone.current) {
      Object.assign(props, readEntryAttribution())
      firstCaptureDone.current = true
    }
    posthog.capture('$pageview', props)
  }, [pathname, searchParams])

  return null
}
