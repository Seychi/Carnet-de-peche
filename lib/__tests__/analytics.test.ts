import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// `server-only` jette hors d'un Server Component. En test (env node), on le
// neutralise pour pouvoir importer lib/analytics-server et vérifier son no-op.
vi.mock('server-only', () => ({}))

// Garde-fous de l'instrumentation analytics (sprint 26 / WS-0).
// On vérifie surtout des INVARIANTS de code (pas le comportement runtime de
// PostHog) : pas de fuite `window.posthog`, no-op SSR garanti.

const analyticsSource = readFileSync(
  join(process.cwd(), 'lib/analytics.ts'),
  'utf-8'
)
const serverSource = readFileSync(
  join(process.cwd(), 'lib/analytics-server.ts'),
  'utf-8'
)

describe('lib/analytics (client)', () => {
  it('ne référence plus window.posthog (legacy stub retiré)', () => {
    expect(analyticsSource).not.toContain('window.posthog')
  })

  it('ne déclare plus le global Window.posthog', () => {
    expect(analyticsSource).not.toMatch(/declare\s+global/)
  })

  it('garde un garde-fou SSR (typeof window === undefined)', () => {
    expect(analyticsSource).toContain("typeof window === 'undefined'")
  })

  it('expose l’API attendue (existante + tunnel de conversion)', async () => {
    // L'import du module ne doit pas jeter en environnement Node (SSR-like).
    const mod = await import('@/lib/analytics')
    const a = mod.analytics
    for (const fn of [
      'catchLogStarted',
      'catchLogCompleted',
      'catchLogAbandoned',
      'paywallViewed',
      'upsellClicked',
      'checkoutStarted',
      'identify',
      'reset',
      'capturePageview',
    ] as const) {
      expect(typeof a[fn], `analytics.${fn} doit être une fonction`).toBe('function')
    }
  })

  it('les captures sont no-op côté serveur (window indéfini) sans jeter', async () => {
    expect(typeof window).toBe('undefined')
    const { analytics } = await import('@/lib/analytics')
    // Aucun de ces appels ne doit lever en SSR (early-return sur window).
    expect(() => {
      analytics.catchLogStarted({ source: 'web' })
      analytics.paywallViewed({ surface: 'map_banner' })
      analytics.upsellClicked({ surface: 'map_banner' })
      analytics.checkoutStarted({ plan: 'local', interval: 'monthly' })
      analytics.identify('user-123')
      analytics.reset()
      analytics.capturePageview('https://example.test/')
    }).not.toThrow()
  })
})

describe('lib/analytics-server', () => {
  it('est protégé par server-only', () => {
    expect(serverSource).toContain("import 'server-only'")
  })

  it('expose captureServer + flush et est no-op sans clé', async () => {
    const prev = process.env.NEXT_PUBLIC_POSTHOG_KEY
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY
    try {
      const { captureServer, flush } = await import('@/lib/analytics-server')
      // Sans clé : aucun envoi, aucun throw.
      expect(() => captureServer('user-123', 'trial_started', { plan: 'local' })).not.toThrow()
      await expect(flush()).resolves.toBeUndefined()
    } finally {
      if (prev !== undefined) process.env.NEXT_PUBLIC_POSTHOG_KEY = prev
    }
  })
})
