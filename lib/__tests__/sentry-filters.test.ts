import { describe, it, expect } from 'vitest'
import {
  isBotUserAgent,
  isHydrationError,
  isReactStreamInterference,
  type SentryEventLike,
} from '@/lib/sentry-filters'

// Sprint 70 Bloc B : filtres anti-bruit Sentry (preuves = issues NEXTJS-A→E).

function eventWith(value: string, frames: Array<{ function?: string }>): SentryEventLike {
  return {
    exception: {
      values: [{ type: 'TypeError', value, stacktrace: { frames } }],
    },
  }
}

describe('isBotUserAgent', () => {
  it('détecte les bots évidents', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1)')).toBe(true)
    expect(isBotUserAgent('Chrome-Lighthouse')).toBe(true)
    expect(isBotUserAgent('HeadlessChrome/120.0')).toBe(true)
  })

  it('laisse passer un vrai navigateur', () => {
    expect(isBotUserAgent('Mozilla/5.0 (Windows NT 10.0) Chrome/149.0.0.0')).toBe(false)
    expect(isBotUserAgent('')).toBe(false)
  })
})

describe('isReactStreamInterference', () => {
  // Reproduit l'issue NEXTJS-A : TypeError parentNode dans le runtime inline $RS
  // du streaming React 19 (stack = document HTML, frame `$RS`).
  it('droppe le TypeError parentNode venant du runtime $RS', () => {
    const event = eventWith("Cannot read properties of null (reading 'parentNode')", [
      { function: '$RS' },
      { function: undefined },
    ])
    expect(isReactStreamInterference(event)).toBe(true)
  })

  it('droppe aussi les variantes $RC (complétion de boundary)', () => {
    const event = eventWith("Cannot read properties of null (reading 'parentNode')", [
      { function: '$RC' },
    ])
    expect(isReactStreamInterference(event)).toBe(true)
  })

  it('NE droppe PAS un parentNode venant de notre code (aucune frame $RS/$RC)', () => {
    const event = eventWith("Cannot read properties of null (reading 'parentNode')", [
      { function: 'MapView.useEffect' },
      { function: 'commitHookEffectListMount' },
    ])
    expect(isReactStreamInterference(event)).toBe(false)
  })

  it('NE droppe PAS une autre erreur passée par $RS (message différent)', () => {
    const event = eventWith('Maximum call stack size exceeded', [{ function: '$RS' }])
    expect(isReactStreamInterference(event)).toBe(false)
  })

  it('reste neutre sur un événement sans exception (message seul)', () => {
    expect(isReactStreamInterference({ message: 'parentNode' })).toBe(false)
    expect(isReactStreamInterference({})).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 88, Bloc 7 — élargissement à la phase de COMMIT de React.
//
// Issue `JAVASCRIPT-NEXTJS-1D` : `insertBefore … not a child of this node`, sur
// une page traduite par un outil tiers. Même cause que A/B/C (le DOM est muté
// sous React), mais aucune frame `$RS` : la casse survient au commit, pas à la
// complétion d'un segment streamé. Le filtre d'origine passait à côté.
//
// Le risque de cet élargissement, c'est d'avaler un vrai bug. Les deux derniers
// tests sont là pour ça, et ils comptent autant que les premiers.
// ─────────────────────────────────────────────────────────────────────────────
describe('isReactStreamInterference — phase de commit (issue 1D)', () => {
  it('★ droppe `insertBefore … not a child` depuis commitMutationEffectsOnFiber', () => {
    const event = eventWith(
      "Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.",
      [{ function: 'commitMutationEffectsOnFiber' }, { function: 'commitMutationEffects' }],
    )
    expect(isReactStreamInterference(event)).toBe(true)
  })

  it('droppe aussi un removeChild parti d’une suppression React', () => {
    const event = eventWith(
      "Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.",
      [{ function: 'commitDeletionEffectsOnFiber' }],
    )
    expect(isReactStreamInterference(event)).toBe(true)
  })

  it('★ CONSERVE une vraie erreur d’hydratation, même avec une frame React', () => {
    // Celle-ci vient de NOUS (rendu serveur ≠ rendu client). La droper reviendrait
    // à masquer un bug que le sprint 70 avait justement décidé de rendre visible et
    // de taguer `hydration: 'suspect'`.
    const event = eventWith(
      "Hydration failed because the server rendered HTML didn't match the client. insertBefore",
      [{ function: 'commitMutationEffectsOnFiber' }],
    )
    expect(isReactStreamInterference(event)).toBe(false)
  })

  it('★ CONSERVE un insertBefore venu de NOTRE code (aucune frame interne React)', () => {
    const event = eventWith(
      "Failed to execute 'insertBefore' on 'Node': not a child of this node.",
      [{ function: 'mountSpotPopup' }, { function: 'MapView' }],
    )
    expect(isReactStreamInterference(event)).toBe(false)
  })

  it('ne droppe pas une erreur de commit dont le message n’a rien à voir', () => {
    const event = eventWith('Cannot read properties of null (reading \'getLayer\')', [
      { function: 'commitMutationEffectsOnFiber' },
    ])
    expect(isReactStreamInterference(event)).toBe(false)
  })
})

describe('isHydrationError', () => {
  it('reconnaît les erreurs React minifiées #418/#423/#425', () => {
    expect(isHydrationError('Minified React error #418; visit https://react.dev/errors/418')).toBe(true)
    expect(isHydrationError('Minified React error #423')).toBe(true)
    expect(isHydrationError('Minified React error #425')).toBe(true)
  })

  it('reconnaît le message non minifié', () => {
    expect(
      isHydrationError("Hydration failed because the server rendered HTML didn't match the client.")
    ).toBe(true)
  })

  it('ignore les autres erreurs React (ex. #419) et les messages quelconques', () => {
    expect(isHydrationError('Minified React error #419')).toBe(false)
    expect(isHydrationError('Failed to fetch')).toBe(false)
    expect(isHydrationError('')).toBe(false)
  })
})
