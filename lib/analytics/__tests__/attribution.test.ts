import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { rememberEntryAttribution, readEntryAttribution } from '@/lib/analytics/attribution'

// Sprint 76, Bloc 7. Deux propriétés à verrouiller :
//  1. le module N'ÉMET RIEN (garde-fou RGPD non négociable du sprint 26) ;
//  2. il fige la source d'ENTRÉE et ne la laisse pas écraser par une page
//     interne, sinon on réintroduit l'auto-référencement qu'on corrige.

const store = new Map<string, string>()

function setWindow(href: string, referrer: string) {
  const url = new URL(href)
  vi.stubGlobal('window', {
    location: { href, search: url.search, hostname: url.hostname },
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  })
  vi.stubGlobal('document', { referrer })
}

beforeEach(() => {
  store.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rememberEntryAttribution — mémorise sans jamais émettre', () => {
  it('n’effectue AUCUN appel réseau (RGPD : rien avant consentement)', () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    setWindow('https://www.carnet-de-peche.com/spots/x', 'https://www.google.com/')
    rememberEntryAttribution()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('retient le referrer externe et son domaine', () => {
    setWindow('https://www.carnet-de-peche.com/spots/x', 'https://www.google.com/search?q=bar')
    rememberEntryAttribution()
    expect(readEntryAttribution()).toEqual({
      $referrer: 'https://www.google.com/search?q=bar',
      $referring_domain: 'www.google.com',
    })
  })

  it('IGNORE un referrer interne (c’est le bug qu’on corrige)', () => {
    setWindow('https://www.carnet-de-peche.com/spots/y', 'https://www.carnet-de-peche.com/spots/x')
    rememberEntryAttribution()
    expect(readEntryAttribution()).toEqual({})
  })

  it('retient les paramètres de campagne', () => {
    setWindow(
      'https://www.carnet-de-peche.com/?utm_source=newsletter&utm_medium=email&utm_campaign=aout',
      '',
    )
    rememberEntryAttribution()
    expect(readEntryAttribution()).toEqual({
      $utm_source: 'newsletter',
      $utm_medium: 'email',
      $utm_campaign: 'aout',
    })
  })

  it('n’écrase JAMAIS la première source de la session', () => {
    setWindow('https://www.carnet-de-peche.com/spots/x', 'https://www.google.com/')
    rememberEntryAttribution()
    // Deuxième page, referrer interne : la source Google doit survivre.
    setWindow('https://www.carnet-de-peche.com/spots/y', 'https://www.carnet-de-peche.com/spots/x')
    rememberEntryAttribution()
    expect(readEntryAttribution().$referring_domain).toBe('www.google.com')
  })

  it('entrée directe (aucun referrer, aucune campagne) → objet vide', () => {
    setWindow('https://www.carnet-de-peche.com/', '')
    rememberEntryAttribution()
    expect(readEntryAttribution()).toEqual({})
  })

  it('ne jette pas si sessionStorage est indisponible (navigation privée stricte)', () => {
    vi.stubGlobal('window', {
      location: { href: 'https://www.carnet-de-peche.com/', search: '', hostname: 'www.carnet-de-peche.com' },
      sessionStorage: {
        getItem: () => {
          throw new Error('SecurityError')
        },
        setItem: () => {
          throw new Error('SecurityError')
        },
      },
    })
    vi.stubGlobal('document', { referrer: 'https://www.google.com/' })
    expect(() => rememberEntryAttribution()).not.toThrow()
    expect(readEntryAttribution()).toEqual({})
  })

  it('ignore un referrer malformé sans jeter', () => {
    setWindow('https://www.carnet-de-peche.com/', 'pas-une-url')
    expect(() => rememberEntryAttribution()).not.toThrow()
    expect(readEntryAttribution().$referring_domain).toBeUndefined()
  })
})

describe('readEntryAttribution — lecture défensive', () => {
  it('renvoie {} sur un contenu corrompu', () => {
    setWindow('https://www.carnet-de-peche.com/', '')
    store.set('cdp-entry-attribution', '{pas du json')
    expect(readEntryAttribution()).toEqual({})
  })

  it('renvoie {} en SSR (pas de window)', () => {
    vi.unstubAllGlobals()
    const original = globalThis.window
    // @ts-expect-error simulation SSR
    delete globalThis.window
    expect(readEntryAttribution()).toEqual({})
    if (original) globalThis.window = original
  })
})
