import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// `server-only` jette hors d'un Server Component. En test (env node), on le
// neutralise pour pouvoir importer le module (même pattern que analytics.test.ts).
vi.mock('server-only', () => ({}))

// Sprint 70 Bloc E — capture PostHog server-side `signup_completed` (audit §3.9).
// Invariant central : fire-and-forget BORNÉ, ne throw JAMAIS, no-op sans clé.
// L'inscription ne doit jamais échouer ni bloquer à cause de l'analytics.

const KEY = 'phc_test_key_sprint70'

function mockFetchOk() {
  const fn = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 1 }), { status: 200 }))
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', KEY)
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com')
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('lib/analytics/server — captureServerEvent', () => {
  it('POste sur /capture/ (hôte EU) avec api_key, event, distinct_id et properties', async () => {
    const fetchMock = mockFetchOk()
    const { captureServerEvent } = await import('@/lib/analytics/server')

    await captureServerEvent('user-123', 'signup_completed', { comp_code_used: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://eu.i.posthog.com/capture/')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.api_key).toBe(KEY)
    expect(body.event).toBe('signup_completed')
    expect(body.distinct_id).toBe('user-123')
    expect(body.properties).toEqual({ comp_code_used: true })
    // Borne temporelle : un AbortSignal est bien posé (timeout court).
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('est no-op sans clé PostHog (aucun fetch)', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
    const fetchMock = mockFetchOk()
    const { captureServerEvent } = await import('@/lib/analytics/server')

    await expect(
      captureServerEvent('user-123', 'signup_completed', { comp_code_used: false })
    ).resolves.toBeUndefined()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('est no-op sans distinct_id (aucun fetch)', async () => {
    const fetchMock = mockFetchOk()
    const { captureServerEvent } = await import('@/lib/analytics/server')

    await captureServerEvent('', 'signup_completed')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('avale silencieusement un échec réseau (fetch reject) — ne throw jamais', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    vi.stubGlobal('fetch', fetchMock)
    const { captureServerEvent } = await import('@/lib/analytics/server')

    await expect(
      captureServerEvent('user-123', 'signup_completed', { comp_code_used: false })
    ).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('avale silencieusement une réponse non-2xx (pas de throw sur res.ok false)', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('server error', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)
    const { captureServerEvent } = await import('@/lib/analytics/server')

    await expect(
      captureServerEvent('user-123', 'signup_completed', { comp_code_used: false })
    ).resolves.toBeUndefined()
  })

  it('normalise un hôte avec slash final (pas de //capture/)', async () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://eu.i.posthog.com/')
    const fetchMock = mockFetchOk()
    const { captureServerEvent } = await import('@/lib/analytics/server')

    await captureServerEvent('user-123', 'signup_completed')
    expect(fetchMock.mock.calls[0][0]).toBe('https://eu.i.posthog.com/capture/')
  })
})

describe('lib/analytics/server — captureSignupCompleted', () => {
  it('émet signup_completed avec comp_code_used (et rien d’autre : pas de PII)', async () => {
    const fetchMock = mockFetchOk()
    const { captureSignupCompleted } = await import('@/lib/analytics/server')

    await captureSignupCompleted('user-456', { comp_code_used: false })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.event).toBe('signup_completed')
    expect(body.distinct_id).toBe('user-456')
    expect(Object.keys(body.properties)).toEqual(['comp_code_used'])
  })
})

describe('invariants de code', () => {
  const source = readFileSync(join(process.cwd(), 'lib/analytics/server.ts'), 'utf-8')

  it('est protégé par server-only', () => {
    expect(source).toContain("import 'server-only'")
  })

  it('borne l’appel réseau (AbortSignal.timeout)', () => {
    expect(source).toContain('AbortSignal.timeout')
  })
})
