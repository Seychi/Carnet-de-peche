import { describe, it, expect, afterEach } from 'vitest'
import { safeGet, safeSet, safeRemove } from '../safe'

/**
 * Sprint 88, Bloc 4. Ces helpers existent pour UNE raison : dans un navigateur qui
 * refuse le stockage, un accès nu lève, et l'exception fait sauter le reste du
 * `useEffect` qui l'entoure. Huit issues Sentry, dont une fonctionnalité morte en
 * silence (la bannière d'installation PWA).
 *
 * On teste les trois façons de refuser, parce qu'elles ne se ressemblent pas :
 *  - la PROPRIÉTÉ `window.sessionStorage` lève (Safari mode strict — issue 14) ;
 *  - `getItem()` lève (issue 1A) ;
 *  - `setItem()` lève (quota plein, mode privé iOS).
 *
 * ⚠️ Ce repo n'a NI jsdom NI happy-dom : toute la suite tourne en environnement
 * `node` (`vitest.config.ts`). On fabrique donc `globalThis.window` à la main, ce
 * qui a un avantage : on contrôle exactement la façon dont l'accès échoue, ce
 * qu'un DOM simulé ne permettrait pas aussi finement.
 */

type Win = { localStorage?: unknown; sessionStorage?: unknown }
const g = globalThis as { window?: Win }

/** Storage en mémoire, suffisant pour le cas nominal. */
function memoryStore(): Storage {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size
    },
  } as Storage
}

/** Installe un `window` dont les deux stockages sont décrits par des getters. */
function installWindow(getters: { local?: () => unknown; session?: () => unknown }) {
  const win: Win = {}
  if (getters.local) Object.defineProperty(win, 'localStorage', { get: getters.local })
  if (getters.session) Object.defineProperty(win, 'sessionStorage', { get: getters.session })
  g.window = win
}

afterEach(() => {
  delete g.window
})

describe('safeGet / safeSet — cas nominal', () => {
  it('écrit puis relit, sur les deux stockages, qui restent distincts', () => {
    const local = memoryStore()
    const session = memoryStore()
    installWindow({ local: () => local, session: () => session })

    expect(safeSet('local', 'k', 'v')).toBe(true)
    expect(safeSet('session', 'k', 'w')).toBe(true)
    expect(safeGet('local', 'k')).toBe('v')
    expect(safeGet('session', 'k')).toBe('w')
  })

  it('rend null sur une clé absente, comme getItem', () => {
    installWindow({ local: () => memoryStore() })
    expect(safeGet('local', 'clé-qui-nexiste-pas')).toBeNull()
  })

  it('supprime une clé', () => {
    const local = memoryStore()
    installWindow({ local: () => local })
    safeSet('local', 'aeffacer', '1')
    expect(safeRemove('local', 'aeffacer')).toBe(true)
    expect(safeGet('local', 'aeffacer')).toBeNull()
  })
})

describe('★ la PROPRIÉTÉ du stockage lève (Safari strict — issue JAVASCRIPT-NEXTJS-14)', () => {
  // C'est LE cas qui justifie la signature `('local' | 'session', key)` plutôt que
  // `(store, key)` : passer `sessionStorage` en argument lèverait sur le site
  // d'appel, avant même d'entrer dans le try/catch du helper.
  const refuse = (what: string) => () => {
    throw new Error(`SecurityError: Failed to read the '${what}' property from 'Window'`)
  }

  it('safeGet rend null au lieu de propager', () => {
    installWindow({ session: refuse('sessionStorage') })
    expect(() => safeGet('session', 'k')).not.toThrow()
    expect(safeGet('session', 'k')).toBeNull()
  })

  it('safeSet rend false au lieu de propager', () => {
    installWindow({ local: refuse('localStorage') })
    expect(() => safeSet('local', 'k', 'v')).not.toThrow()
    expect(safeSet('local', 'k', 'v')).toBe(false)
  })

  it('safeRemove rend false au lieu de propager', () => {
    installWindow({ local: refuse('localStorage') })
    expect(safeRemove('local', 'k')).toBe(false)
  })
})

describe('les méthodes du stockage lèvent', () => {
  it('getItem qui lève (« The operation is insecure », issue 1A) → null', () => {
    installWindow({
      local: () => ({
        getItem: () => {
          throw new Error('SecurityError: The operation is insecure.')
        },
        setItem: () => undefined,
        removeItem: () => undefined,
      }),
    })
    expect(safeGet('local', 'k')).toBeNull()
  })

  it('setItem qui lève (quota plein) → false, et ne casse pas l’appelant', () => {
    installWindow({
      local: () => ({
        getItem: () => null,
        setItem: () => {
          throw new Error('QuotaExceededError')
        },
        removeItem: () => undefined,
      }),
    })
    expect(() => safeSet('local', 'k', 'v')).not.toThrow()
    expect(safeSet('local', 'k', 'v')).toBe(false)
  })

  it('un stockage absent (navigateur in-app) ne casse rien', () => {
    installWindow({ session: () => null })
    expect(safeGet('session', 'k')).toBeNull()
    expect(safeSet('session', 'k', 'v')).toBe(false)
  })
})

describe('rendu serveur', () => {
  it('sans `window` du tout, tout dégrade sans lever', () => {
    // Pas d'installWindow : on est en environnement node nu, comme au SSR.
    expect(safeGet('local', 'k')).toBeNull()
    expect(safeSet('local', 'k', 'v')).toBe(false)
    expect(safeRemove('local', 'k')).toBe(false)
  })
})
