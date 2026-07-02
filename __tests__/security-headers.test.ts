// Tests sprint 70 Bloc C : la CSP est en ENFORCE (fin du Report-Only du sprint 35),
// avec les origines réellement utilisées par le client (MapLibre worker blob:,
// wss Supabase, PostHog EU eu.i.posthog.com, Sentry ingest, Stripe, MapTiler),
// Permissions-Policy posée, et un canal de rapport (report-uri Sentry) actif.
// next.config.ts calcule la CSP au chargement du module → vi.resetModules() +
// import dynamique après manipulation de process.env.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type HeaderKV = { key: string; value: string }
type HeaderRule = { source: string; headers: HeaderKV[] }
type ConfigWithHeaders = { headers: () => Promise<HeaderRule[]> }

const DSN_BACKUP = process.env.NEXT_PUBLIC_SENTRY_DSN

async function loadHeaders(): Promise<HeaderKV[]> {
  vi.resetModules()
  const mod = (await import('../next.config')) as { default: ConfigWithHeaders }
  const rules = await mod.default.headers()
  // Une seule règle, appliquée à toutes les routes.
  expect(rules).toHaveLength(1)
  expect(rules[0].source).toBe('/(.*)')
  return rules[0].headers
}

function headerValue(headers: HeaderKV[], key: string): string | null {
  return headers.find((h) => h.key === key)?.value ?? null
}

afterEach(() => {
  if (DSN_BACKUP === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN
  else process.env.NEXT_PUBLIC_SENTRY_DSN = DSN_BACKUP
})

describe('en-têtes de sécurité (sprint 70 : CSP enforce + Permissions-Policy)', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
  })

  it('sert Content-Security-Policy en ENFORCE, plus de Report-Only', async () => {
    const headers = await loadHeaders()
    expect(headerValue(headers, 'Content-Security-Policy')).toBeTruthy()
    expect(headerValue(headers, 'Content-Security-Policy-Report-Only')).toBeNull()
  })

  it('garde les en-têtes fermes du sprint 35 (XFO, nosniff, HSTS, Referrer-Policy)', async () => {
    const headers = await loadHeaders()
    expect(headerValue(headers, 'X-Frame-Options')).toBe('DENY')
    expect(headerValue(headers, 'X-Content-Type-Options')).toBe('nosniff')
    expect(headerValue(headers, 'Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(headerValue(headers, 'Strict-Transport-Security')).toContain('max-age=63072000')
  })

  it('pose Permissions-Policy : caméra/micro coupés, géoloc self (log de prise)', async () => {
    const headers = await loadHeaders()
    expect(headerValue(headers, 'Permissions-Policy')).toBe(
      'camera=(), microphone=(), geolocation=(self)',
    )
  })

  it('CSP : toutes les origines légitimes du client sont ouvertes', async () => {
    const csp = headerValue(await loadHeaders(), 'Content-Security-Policy')!

    // MapLibre : worker créé via blob + images data:/blob: (doc MapLibre).
    expect(csp).toMatch(/worker-src [^;]*blob:/)
    expect(csp).toMatch(/child-src [^;]*blob:/)
    expect(csp).toMatch(/img-src [^;]*data:/)
    expect(csp).toMatch(/img-src [^;]*blob:/)
    // MapTiler (styles + tuiles + glyphs).
    expect(csp).toMatch(/connect-src [^;]*https:\/\/api\.maptiler\.com/)
    // Supabase REST/Storage + Realtime WebSocket.
    expect(csp).toMatch(/connect-src [^;]*https:\/\/\*\.supabase\.co/)
    expect(csp).toMatch(/connect-src [^;]*wss:\/\/\*\.supabase\.co/)
    // PostHog EU : le VRAI hôte api_host est eu.i.posthog.com (PostHogProvider).
    expect(csp).toMatch(/script-src [^;]*https:\/\/eu\.i\.posthog\.com/)
    expect(csp).toMatch(/script-src [^;]*https:\/\/eu-assets\.i\.posthog\.com/)
    expect(csp).toMatch(/connect-src [^;]*https:\/\/eu\.i\.posthog\.com/)
    // L'hôte FAUX du Report-Only (eu.posthog.com sans .i) ne doit PAS revenir.
    expect(csp).not.toContain('https://eu.posthog.com')
    // Sentry ingest (pas de tunnel).
    expect(csp).toMatch(/connect-src [^;]*https:\/\/\*\.ingest\.sentry\.io/)
    expect(csp).toMatch(/connect-src [^;]*https:\/\/\*\.ingest\.de\.sentry\.io/)
    // Stripe (Checkout/Portal par redirection + futurs Elements).
    expect(csp).toMatch(/script-src [^;]*https:\/\/js\.stripe\.com/)
    expect(csp).toMatch(/frame-src [^;]*https:\/\/checkout\.stripe\.com/)
    expect(csp).toMatch(/form-action [^;]*https:\/\/checkout\.stripe\.com/)
    // Login Google no-JS : la soumission <form action={signInWithGoogle}> redirige
    // via supabase.co/auth/v1/authorize puis accounts.google.com (revue sprint 70).
    expect(csp).toMatch(/form-action [^;]*https:\/\/\*\.supabase\.co/)
    expect(csp).toMatch(/form-action [^;]*https:\/\/accounts\.google\.com/)
    // Géocodage client : BAN + Nominatim reverse (CatchForm).
    expect(csp).toMatch(/connect-src [^;]*https:\/\/api-adresse\.data\.gouv\.fr/)
    expect(csp).toMatch(/connect-src [^;]*https:\/\/nominatim\.openstreetmap\.org/)
    // Verrous.
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it("CSP : pas d''unsafe-eval' hors dev (NODE_ENV=test ici)", async () => {
    const csp = headerValue(await loadHeaders(), 'Content-Security-Policy')!
    expect(csp).not.toContain("'unsafe-eval'")
  })

  it('CSP : report-uri dérivé du DSN Sentry quand il est présent', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://abc123@o4500.ingest.de.sentry.io/4509'
    const csp = headerValue(await loadHeaders(), 'Content-Security-Policy')!
    expect(csp).toContain(
      'report-uri https://o4500.ingest.de.sentry.io/api/4509/security/?sentry_key=abc123',
    )
  })

  it('CSP : pas de report-uri (et pas de crash) sans DSN ou avec un DSN invalide', async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
    let csp = headerValue(await loadHeaders(), 'Content-Security-Policy')!
    expect(csp).not.toContain('report-uri')

    process.env.NEXT_PUBLIC_SENTRY_DSN = 'pas-un-dsn'
    csp = headerValue(await loadHeaders(), 'Content-Security-Policy')!
    expect(csp).not.toContain('report-uri')
  })
})
