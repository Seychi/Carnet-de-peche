import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Teste la logique `isProd` de lib/env.ts — c'est elle qui pilote la validation
 * de TOUS les builds (un manque de var = throw au chargement du module) :
 *   - les 2 NEXT_PUBLIC_SUPABASE_* sont requises PARTOUT (dev, preview, prod) ;
 *   - les vars serveur (service-role, cron, resend, sentry) et le jeu Stripe
 *     LIVE ne sont requis qu'en prod (VERCEL_ENV=production) ; en dev/preview
 *     ils restent optionnels et c'est le jeu Stripe TEST qui est exigé.
 *
 * Méthode : on pilote process.env (clés ciblées sauvegardées/restaurées), puis
 * on (ré)importe dynamiquement le module — qui valide au chargement et lève si
 * invalide. `vi.resetModules()` force une réévaluation propre à chaque import.
 */

const SUPABASE_OK = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
}

const STRIPE_TEST_OK = {
  STRIPE_TEST_SECRET_KEY: 'sk_test_x',
  STRIPE_TEST_WEBHOOK_SECRET: 'whsec_test_x',
  NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY: 'pk_test_x',
  STRIPE_TEST_PRICE_LOCAL_MONTHLY: 'price_tlm',
  STRIPE_TEST_PRICE_LOCAL_ANNUAL: 'price_tla',
  STRIPE_TEST_PRICE_ITINERANT_MONTHLY: 'price_tim',
  STRIPE_TEST_PRICE_ITINERANT_ANNUAL: 'price_tia',
}

const STRIPE_LIVE_OK = {
  STRIPE_SECRET_KEY: 'sk_live_x',
  STRIPE_WEBHOOK_SECRET: 'whsec_live_x',
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_x',
  STRIPE_PRICE_LOCAL_MONTHLY: 'price_lm',
  STRIPE_PRICE_LOCAL_ANNUAL: 'price_la',
  STRIPE_PRICE_ITINERANT_MONTHLY: 'price_im',
  STRIPE_PRICE_ITINERANT_ANNUAL: 'price_ia',
}

const PROD_SERVER_OK = {
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  CRON_SECRET: 'cron-secret-1234',
  RESEND_API_KEY: 're_xxxxxxxx',
  NEXT_PUBLIC_SENTRY_DSN: 'https://abc@o1.ingest.sentry.io/1',
  // Analytics PostHog (sprint 26) — clé requise en prod (host a un défaut).
  NEXT_PUBLIC_POSTHOG_KEY: 'phc_xxxxxxxx',
}

// Toutes les clés pilotées par ces tests (sauvegardées puis restaurées).
const MANAGED_KEYS = [
  'VERCEL_ENV',
  'SUPABASE_PROJECT_REF',
  ...Object.keys(SUPABASE_OK),
  ...Object.keys(STRIPE_TEST_OK),
  ...Object.keys(STRIPE_LIVE_OK),
  ...Object.keys(PROD_SERVER_OK),
]

let saved: Record<string, string | undefined>

/** Repart d'un env propre (clés pilotées effacées) puis applique `vars`. */
function setEnv(vars: Record<string, string>) {
  for (const k of MANAGED_KEYS) delete process.env[k]
  Object.assign(process.env, vars)
}

async function loadEnv() {
  vi.resetModules()
  return import('@/lib/env')
}

beforeEach(() => {
  saved = {}
  for (const k of MANAGED_KEYS) saved[k] = process.env[k]
  // Le module logge l'erreur de parse avant de throw : on tait le bruit.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  for (const k of MANAGED_KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  vi.restoreAllMocks()
  vi.resetModules()
})

describe('lib/env — validation des variables d’environnement', () => {
  it('dev/preview : les 2 NEXT_PUBLIC_SUPABASE_* + le jeu Stripe TEST suffisent', async () => {
    setEnv({ ...SUPABASE_OK, ...STRIPE_TEST_OK })
    const mod = await loadEnv()
    expect(mod.env.NEXT_PUBLIC_SUPABASE_URL).toBe(SUPABASE_OK.NEXT_PUBLIC_SUPABASE_URL)
    expect(mod.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(SUPABASE_OK.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  })

  it('dev/preview : les vars serveur (service-role, cron, resend, sentry) sont optionnelles', async () => {
    // Aucune var serveur fournie : le module doit charger sans lever.
    setEnv({ ...SUPABASE_OK, ...STRIPE_TEST_OK })
    await expect(loadEnv()).resolves.toBeDefined()
  })

  it('NEXT_PUBLIC_SUPABASE_URL manquante → throw (requise partout)', async () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key', ...STRIPE_TEST_OK })
    await expect(loadEnv()).rejects.toThrow()
  })

  it('NEXT_PUBLIC_SUPABASE_ANON_KEY manquante → throw (requise partout)', async () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: SUPABASE_OK.NEXT_PUBLIC_SUPABASE_URL, ...STRIPE_TEST_OK })
    await expect(loadEnv()).rejects.toThrow()
  })

  it('NEXT_PUBLIC_SUPABASE_URL non-URL → throw', async () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'pas-une-url', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key', ...STRIPE_TEST_OK })
    await expect(loadEnv()).rejects.toThrow()
  })

  it('dev/preview : sans le jeu Stripe TEST → throw', async () => {
    setEnv({ ...SUPABASE_OK })
    await expect(loadEnv()).rejects.toThrow()
  })

  it('prod (VERCEL_ENV=production) : sans les vars serveur ni le jeu Stripe LIVE → throw', async () => {
    setEnv({ VERCEL_ENV: 'production', ...SUPABASE_OK })
    await expect(loadEnv()).rejects.toThrow()
  })

  it('prod : avec vars serveur + jeu Stripe LIVE complet → OK', async () => {
    setEnv({
      VERCEL_ENV: 'production',
      ...SUPABASE_OK,
      ...PROD_SERVER_OK,
      ...STRIPE_LIVE_OK,
    })
    const mod = await loadEnv()
    expect(mod.env.SUPABASE_SERVICE_ROLE_KEY).toBe(PROD_SERVER_OK.SUPABASE_SERVICE_ROLE_KEY)
    expect(mod.env.STRIPE_SECRET_KEY).toBe(STRIPE_LIVE_OK.STRIPE_SECRET_KEY)
  })

  it('prod : jeu Stripe LIVE incomplet (un price_id manquant) → throw', async () => {
    const incompleteLive = { ...STRIPE_LIVE_OK }
    delete (incompleteLive as Record<string, string>).STRIPE_PRICE_ITINERANT_ANNUAL
    setEnv({
      VERCEL_ENV: 'production',
      ...SUPABASE_OK,
      ...PROD_SERVER_OK,
      ...incompleteLive,
    })
    await expect(loadEnv()).rejects.toThrow()
  })
})
