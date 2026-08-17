// Sprint 84, Bloc 2 : le middleware ne doit PLUS créer de client Supabase (donc
// plus faire l'aller-retour réseau `GET /user` du `auth.getUser()`) sur les
// routes publiques servies au trafic SEO. Ce fichier prouve les deux sens :
//   - 0 appel `createServerClient` sur les routes publiques sans cookie ;
//   - >= 1 appel sur les routes app / auth, ET sur une route publique visitée
//     AVEC un cookie de session (le middleware reste le seul endroit capable de
//     persister un token rafraîchi, cf commentaire de `middleware.ts`).
// Le reste des assertions verrouille l'existant : `?redirect` (sprint 70 Bloc C),
// `/carnet/nouvelle` ouverte aux anonymes (sprint 77 Bloc 7), onboarding.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  const state: { user: { id: string } | null; onboarded: boolean } = {
    user: null,
    onboarded: false,
  }

  const createServerClient = vi.fn(() => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: state.user ? { onboarded: state.onboarded } : null,
          }),
        }),
      }),
    }),
  }))

  return { state, createServerClient }
})

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
}))

import { middleware } from '../middleware'

const BASE = 'https://www.carnet-de-peche.com'

// Cookie de session tel que l'écrit @supabase/ssr : `sb-<project-ref>-auth-token`.
const SESSION_COOKIE = 'sb-glgciwwnpmgifyhbvxsw-auth-token=base64-eyJhbGciOiJ9'

function req(path: string, cookie?: string) {
  return new NextRequest(
    `${BASE}${path}`,
    cookie ? { headers: { cookie } } : undefined
  )
}

/** Connecte un utilisateur pour le test courant. */
function signIn(onboarded: boolean) {
  mocks.state.user = { id: 'u-1' }
  mocks.state.onboarded = onboarded
}

beforeEach(() => {
  mocks.createServerClient.mockClear()
  mocks.state.user = null
  mocks.state.onboarded = false
})

// Les 4 routes du brief + un échantillon large de tout ce que le matcher laisse
// désormais passer sans middleware (API, OG, partage, pages marketing).
const PUBLIC_ROUTES = [
  '/',
  '/spots/pointe-du-grand-minou',
  '/especes/bar',
  '/peche/bar/leurres/finistere',
  '/spots',
  '/especes',
  '/guides/peche-du-bar-au-leurre',
  '/tarifs',
  '/fil', // teaser public : APP_ROUTES contient « /fil/ », pas « /fil »
  '/carte',
  '/c/une-prise',
  '/unsubscribe',
  '/api/spots/nearby',
  '/og/spot/pointe-du-grand-minou',
]

// Les 13 entrées de APP_ROUTES (« /fil/ » instanciée en « /fil/29 »), qui
// doivent toutes conserver le comportement du sprint 70 Bloc C.
const APP_ROUTE_PATHS = [
  '/home',
  '/carnet',
  '/onboarding',
  '/fil/29',
  '/follows',
  '/profil',
  '/compte',
  '/classements',
  '/sorties',
  '/notifications',
  '/moderation',
  '/spots/mes-propositions',
  '/spots/proposer',
]

describe('middleware : aucun client Supabase sur les routes publiques (sprint 84 Bloc 2)', () => {
  for (const path of PUBLIC_ROUTES) {
    it(`${path} → 0 appel à createServerClient`, async () => {
      const res = await middleware(req(path))
      expect(mocks.createServerClient).not.toHaveBeenCalled()
      expect(res.headers.get('location')).toBeNull()
    })
  }

  for (const path of ['/home', '/carnet', '/auth/login', '/spots/proposer', '/carnet/nouvelle']) {
    it(`${path} → au moins 1 appel à createServerClient`, async () => {
      await middleware(req(path))
      expect(mocks.createServerClient.mock.calls.length).toBeGreaterThanOrEqual(1)
    })
  }

  it('une route publique visitée AVEC un cookie de session crée quand même le client (le refresh de token reste possible)', async () => {
    signIn(true)
    const res = await middleware(req('/spots/pointe-du-grand-minou', SESSION_COOKIE))
    expect(mocks.createServerClient.mock.calls.length).toBeGreaterThanOrEqual(1)
    // …mais toujours aucune redirection : la route reste publique.
    expect(res.headers.get('location')).toBeNull()
  })

  it('un cookie non-Supabase ne réveille pas le middleware', async () => {
    const res = await middleware(req('/especes/bar', 'ph_phc_posthog=1; consent=all'))
    expect(mocks.createServerClient).not.toHaveBeenCalled()
    expect(res.headers.get('location')).toBeNull()
  })

  it('le cookie PKCE seul (…-auth-token-code-verifier) ne réveille pas le middleware', async () => {
    await middleware(req('/', 'sb-glgciwwnpmgifyhbvxsw-auth-token-code-verifier=abc'))
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it('un cookie de session découpé (…-auth-token.0) réveille le middleware', async () => {
    signIn(true)
    await middleware(req('/', 'sb-glgciwwnpmgifyhbvxsw-auth-token.0=base64-abc'))
    expect(mocks.createServerClient.mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})

describe('middleware : les 13 entrées de APP_ROUTES gardent leur comportement', () => {
  for (const path of APP_ROUTE_PATHS) {
    it(`anonyme sur ${path} → /auth/login?redirect=${path}`, async () => {
      const res = await middleware(req(path))
      const location = res.headers.get('location')
      expect(location).toBeTruthy()
      const url = new URL(location!)
      expect(url.pathname).toBe('/auth/login')
      expect(url.searchParams.get('redirect')).toBe(path)
    })
  }

  it('anonyme sur /classements → ?redirect préservé (sprint 70 Bloc C)', async () => {
    const res = await middleware(req('/classements'))
    expect(res.headers.get('location')).toBe(
      `${BASE}/auth/login?redirect=%2Fclassements`
    )
  })

  it('anonyme sur /carnet/nouvelle → passe (sprint 77 Bloc 7)', async () => {
    const res = await middleware(req('/carnet/nouvelle'))
    expect(res.headers.get('location')).toBeNull()
  })
})

describe('middleware : onboarding et pages auth (logique inchangée)', () => {
  it('connecté non-onboardé sur une route app → /onboarding/1', async () => {
    signIn(false)
    const res = await middleware(req('/home', SESSION_COOKIE))
    expect(res.headers.get('location')).toBe(`${BASE}/onboarding/1`)
  })

  it('connecté non-onboardé sur /carnet/nouvelle → /onboarding/1 (exception d’AUTH seulement)', async () => {
    signIn(false)
    const res = await middleware(req('/carnet/nouvelle', SESSION_COOKIE))
    expect(res.headers.get('location')).toBe(`${BASE}/onboarding/1`)
  })

  it('connecté non-onboardé sur /onboarding/1 → passe', async () => {
    signIn(false)
    const res = await middleware(req('/onboarding/1', SESSION_COOKIE))
    expect(res.headers.get('location')).toBeNull()
  })

  it('connecté onboardé sur /onboarding/1 → /home', async () => {
    signIn(true)
    const res = await middleware(req('/onboarding/1', SESSION_COOKIE))
    expect(res.headers.get('location')).toBe(`${BASE}/home`)
  })

  it('connecté onboardé sur /onboarding/fini → passe', async () => {
    signIn(true)
    const res = await middleware(req('/onboarding/fini', SESSION_COOKIE))
    expect(res.headers.get('location')).toBeNull()
  })

  it('connecté sur /auth/login → /home', async () => {
    signIn(true)
    const res = await middleware(req('/auth/login', SESSION_COOKIE))
    expect(res.headers.get('location')).toBe(`${BASE}/home`)
  })

  it('anonyme sur /auth/login → passe', async () => {
    const res = await middleware(req('/auth/login'))
    expect(res.headers.get('location')).toBeNull()
  })
})
