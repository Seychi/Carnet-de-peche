// Tests sprint 70 Bloc C : les fetchs de polices OG sont BORNÉS (AbortSignal) et
// résilients (jamais de throw → jamais de 500, invariant sprint 55). Le module
// mémoïse au niveau module → vi.resetModules() + import dynamique par test.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('loadOgFonts (borné + résilient, sprint 70)', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('passe un AbortSignal (borne anti-timeout 25 s) à CHAQUE fetch de police', async () => {
    const seenInits: Array<RequestInit | undefined> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        seenInits.push(init)
        return new Response(new ArrayBuffer(8), { status: 200 })
      }),
    )

    const { loadOgFonts } = await import('../fonts')
    const fonts = await loadOgFonts()

    expect(fonts.length).toBeGreaterThan(0)
    expect(seenInits.length).toBeGreaterThan(0)
    for (const init of seenInits) {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
    }
  })

  it('retourne [] sans throw (jamais de 500) si tous les fetchs échouent', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('CDN KO')
      }),
    )

    const { loadOgFonts } = await import('../fonts')
    await expect(loadOgFonts()).resolves.toEqual([])
  })

  it('ne mémoïse PAS un échec total : retente au rendu suivant', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('CDN KO au cold start')
    })
    vi.stubGlobal('fetch', fetchMock)

    const { loadOgFonts } = await import('../fonts')
    await loadOgFonts()
    const callsAfterFirstRender = fetchMock.mock.calls.length

    await loadOgFonts()
    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirstRender)
  })

  it('mémoïse un succès : un seul fetch par police pour toute la vie de l\'instance', async () => {
    const fetchMock = vi.fn(async () => new Response(new ArrayBuffer(8), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const { loadOgFonts } = await import('../fonts')
    await loadOgFonts()
    const callsAfterFirstRender = fetchMock.mock.calls.length

    await loadOgFonts()
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirstRender)
  })
})
