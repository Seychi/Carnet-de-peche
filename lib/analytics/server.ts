// Analytics SERVEUR sans SDK — POST direct sur l'endpoint public `/capture/`
// de PostHog (clé projet NEXT_PUBLIC_POSTHOG_KEY : publique, pas un secret).
//
// Pourquoi pas lib/analytics-server.ts (posthog-node) ? Ici on instrumente une
// SERVER ACTION d'inscription (app/auth/login/actions.ts) : on veut un envoi
// unique, BORNÉ dans le temps (AbortSignal.timeout) et sans file/flush() à
// orchestrer avant un redirect(). posthog-node + flush() reste le bon outil
// pour les rafales d'événements des webhooks Stripe (lib/stripe/events.ts).
//
// Règles (invariants analytics du sprint 26) :
//  - AUCUNE PII dans les propriétés : jamais d'email, de pseudo, de coords.
//  - distinct_id = user_id Supabase (la même personne que analytics.identify
//    côté client → les events client + serveur se rattachent au même profil).
//  - No-op sans clé (dev/preview) ; échec réseau/timeout SILENCIEUX : cette
//    instrumentation ne doit JAMAIS bloquer ni faire échouer le flux appelant
//    (une inscription qui réussit doit réussir, PostHog up ou down).
import 'server-only'
import { headers } from 'next/headers'
import { devicePropsFromUserAgent } from './user-agent'

// Borne dure de l'appel réseau : au pire, l'inscription attend 1,5 s de plus.
const CAPTURE_TIMEOUT_MS = 1500

/**
 * Sprint 79, Bloc 0 — les événements serveur partaient sans `$device_type`, donc
 * aucun funnel filtré « Mobile » ne pouvait se terminer. On joint la famille
 * d'appareil, lue sur le User-Agent de la requête en cours.
 *
 * Ne throw jamais : hors contexte de requête, `headers()` lève, et un événement
 * sans propriété d'appareil vaut mieux qu'un flux appelant cassé.
 */
async function deviceProperties(): Promise<Record<string, unknown>> {
  try {
    const store = await headers()
    return devicePropsFromUserAgent(store.get('user-agent')) ?? {}
  } catch {
    return {}
  }
}

/**
 * Capture un événement PostHog côté serveur, rattaché à `distinctId`
 * (user_id Supabase). Fire-and-forget borné : résout TOUJOURS, ne throw jamais.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!apiKey || !distinctId || !event) return

  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com').replace(
    /\/+$/,
    '',
  )

  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        // Appareil D'ABORD : un appelant qui passerait explicitement `$device_type`
        // reste prioritaire sur la valeur dérivée.
        properties: { ...(await deviceProperties()), ...(properties ?? {}) },
        timestamp: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(CAPTURE_TIMEOUT_MS),
      cache: 'no-store',
    })
  } catch {
    // Silencieux : un échec d'analytics (réseau, timeout, 4xx/5xx) ne remonte jamais.
  }
}

/**
 * Événement d'acquisition `signup_completed` (audit 2026-07-02 §3.9) : émis
 * server-side à la création réussie du compte, base du funnel
 * visite → inscription → 1re prise. `comp_code_used` = un code fondateur
 * (sprint 68) a été échangé avec succès pendant l'inscription.
 */
export function captureSignupCompleted(
  userId: string,
  props: { comp_code_used: boolean },
): Promise<void> {
  return captureServerEvent(userId, 'signup_completed', props)
}
