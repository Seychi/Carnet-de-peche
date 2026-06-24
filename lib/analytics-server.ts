// Analytics SERVEUR — posthog-node, init lazy, mode EU.
//
// Usage : événements de cycle de vie d'abonnement émis depuis les webhooks
// Stripe (lib/stripe/events.ts), où il n'y a pas de navigateur. Le distinctId
// DOIT être le user_id Supabase (le même que `analytics.identify(userId)` côté
// client) pour que les events client + serveur se rattachent à la même personne.
//
// Règles :
//  - No-op si NEXT_PUBLIC_POSTHOG_KEY absente (dev/preview sans clé).
//  - AUCUNE PII dans les props (pas d'email, pas de coords). Plan / interval / tier OK.
//  - `flush()` à appeler après une rafale d'events (les routes serverless
//    peuvent geler avant l'envoi réseau différé sinon).

import 'server-only'
import { PostHog } from 'posthog-node'

let client: PostHog | null = null
let initTried = false

/** Init paresseuse : une seule instance par process, no-op sans clé. */
function getClient(): PostHog | null {
  if (initTried) return client
  initTried = true

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com'
  client = new PostHog(key, {
    host,
    // En contexte serverless, on veut envoyer vite (peu d'events, pas de batch long).
    flushAt: 1,
    flushInterval: 0,
  })
  return client
}

/**
 * Capture un event serveur rattaché à `distinctId` (user_id Supabase).
 * Ne throw jamais : l'instrumentation ne doit pas casser un webhook.
 */
export function captureServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  try {
    const ph = getClient()
    if (!ph) return
    ph.capture({ distinctId, event, properties })
  } catch {
    // silencieux : un échec d'analytics ne doit jamais remonter
  }
}

/** Vide la file d'envoi (à appeler avant la fin d'une route serverless). */
export async function flush(): Promise<void> {
  try {
    const ph = getClient()
    if (!ph) return
    await ph.flush()
  } catch {
    // silencieux
  }
}
