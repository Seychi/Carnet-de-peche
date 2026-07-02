// Tests sprint 70 Bloc C (audit 2026-07-02 §3.8) : les routes (app) ajoutées à
// APP_ROUTES redirigent un visiteur anonyme vers /auth/login EN PRÉSERVANT la
// cible (?redirect=…), et les routes publiques restent ouvertes (notamment
// /spots et /spots/[slug] : l'annuaire public ne doit JAMAIS être capturé).
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Visiteur anonyme : getUser → user null. Le mock couvre aussi `from` (jamais
// atteint pour un anonyme, présent par sûreté de type).
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: async () => ({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: null }),
        }),
      }),
    }),
  }),
}))

import { middleware } from '../middleware'

const BASE = 'https://www.carnet-de-peche.com'

// Les 5 routes de l'audit §3.8 + /spots/proposer (même groupe (app), même bug)
// + un échantillon des routes historiques (non-régression).
const PROTECTED_ROUTES = [
  '/classements',
  '/sorties',
  '/notifications',
  '/moderation',
  '/spots/mes-propositions',
  '/spots/proposer',
  '/home',
  '/carnet',
  '/compte',
]

const PUBLIC_ROUTES = ['/', '/spots', '/spots/pointe-de-pen-hir', '/fil', '/especes', '/tarifs']

describe('middleware APP_ROUTES (sprint 70 : ?redirect préservé)', () => {
  for (const path of PROTECTED_ROUTES) {
    it(`anonyme sur ${path} → /auth/login?redirect=${path}`, async () => {
      const res = await middleware(new NextRequest(`${BASE}${path}`))
      const location = res.headers.get('location')
      expect(location).toBeTruthy()
      const url = new URL(location!)
      expect(url.pathname).toBe('/auth/login')
      expect(url.searchParams.get('redirect')).toBe(path)
    })
  }

  for (const path of PUBLIC_ROUTES) {
    it(`anonyme sur ${path} → passe (aucune redirection)`, async () => {
      const res = await middleware(new NextRequest(`${BASE}${path}`))
      expect(res.headers.get('location')).toBeNull()
    })
  }
})
