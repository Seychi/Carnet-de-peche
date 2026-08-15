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
/**
 * Comptage SANS COOKIE pour les visiteurs non consentants (sprint 81, Bloc 1).
 *
 * ⚠️ DERRIÈRE UN DRAPEAU, à dessein. `NEXT_PUBLIC_ANALYTICS_COOKIELESS` absent ou
 * `'0'` ⇒ comportement STRICTEMENT identique à avant le sprint. Le bloc touche à
 * la conformité : il se code sans attendre l'avis juridique, il ne s'allume que
 * sur décision de John.
 *
 * Pourquoi ça existe : 427 visiteurs vus dans PostHog sur 30 jours contre ~1 495
 * clics Google. On pilote une roadmap de conversion sur ~29 % du réel, et sur la
 * fraction la plus patiente du public, celle qui a cliqué « Accepter ».
 */
export function cookielessEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ANALYTICS_COOKIELESS
  return flag === '1' || flag === 'true'
}

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
    // ⚠️ SPRINT 81, Bloc 1 — vérifié dans le SDK INSTALLÉ, pas de mémoire :
    // `cookieless_mode?: 'always' | 'on_reject'` est déclaré dans
    // `@posthog/types@1.391.0` (`posthog-config.d.ts:1589`) et présent dans le
    // bundle de `posthog-js@1.393.0`. Aucune montée de version nécessaire.
    //
    // Pourquoi `'on_reject'` et pas `'always'` : `'always'` couperait les cookies
    // pour TOUT LE MONDE, y compris ceux qui ont accepté, et on perdrait le
    // funnel identifié qui est la seule chose que la roadmap sait lire de bout
    // en bout. `'on_reject'` garde le comportement actuel pour qui accepte.
    //
    // ★ La question décisive du brief (« `on_reject` couvre-t-il celui qui n'a
    // PAS ENCORE répondu, ou seulement celui qui a refusé ? ») est tranchée par
    // la doc de `is_capturing()` dans le SDK installé : la capture sans cookie
    // s'applique si l'utilisateur « has opted out **or been defaulted to
    // opt-out** ». Or `opt_out_capturing_by_default: true` met précisément le
    // visiteur qui n'a pas répondu dans cet état. Les deux cas sont donc
    // couverts, et `lib/consent.ts` n'a pas besoin de changer.
    ...(cookielessEnabled() ? { cookieless_mode: 'on_reject' as const } : {}),
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
