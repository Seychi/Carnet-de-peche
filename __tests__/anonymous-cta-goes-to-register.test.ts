import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Sprint 85, Bloc 1 — un visiteur SANS COMPTE doit arriver sur l'INSCRIPTION.
 *
 * Le critère du brief est « un anonyme qui clique un CTA gaté arrive sur une page
 * d'inscription avec son `?redirect=` intact ». Deux choses à prouver, et une
 * seule ne suffit pas :
 *
 *  1. le CTA produit bien une URL `/auth/register?redirect=…` (le CHEMIN) ;
 *  2. `/auth/register` RELIT ce `?redirect=` et le repasse au formulaire, sinon
 *     le visiteur s'inscrit et atterrit ailleurs (l'invariant du sprint 70 Bloc C).
 *
 * Le point 2 est prouvé en exécutant la VRAIE page serveur, pas en relisant le
 * code : c'est là que le `?redirect=` se perdait au sprint 76 (BUG-10).
 */

// `tsconfig.json` est en `jsx: preserve` : esbuild (transformeur de Vitest) compile
// le JSX des pages vers `React.createElement` sans importer React. Hors bundler
// Next, il faut fournir le global. Shim de test uniquement (même que
// `components/layout/__tests__/header-public-static.test.ts`).
;(globalThis as unknown as { React: typeof React }).React = React

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8')

vi.mock('@/app/auth/login/login-client', () => ({
  // Composant sonde : on inspecte les props que la page serveur lui passe.
  LoginPageClient: () => null,
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  }),
}))

describe('CTA anonyme → /auth/register, ?redirect= intact', () => {
  it('le lien produit vise bien /auth/register en portant la cible de retour', async () => {
    const { buildSignupHref } = await import('@/lib/gating/wall')
    expect(buildSignupHref('/spots/pointe-du-raz')).toBe(
      '/auth/register?redirect=%2Fspots%2Fpointe-du-raz',
    )
  })

  it("/auth/register relit ce ?redirect= et le passe au formulaire", async () => {
    const { buildSignupHref } = await import('@/lib/gating/wall')
    const href = buildSignupHref('/spots/pointe-du-raz')

    // On rejoue exactement ce que Next donnerait à la page à partir de ce lien.
    const query = new URLSearchParams(href.split('?')[1])
    const searchParams = Object.fromEntries(query.entries())

    const RegisterPage = (await import('@/app/auth/register/page')).default
    const element = await RegisterPage({ searchParams: Promise.resolve(searchParams) })
    const props = (element as unknown as { props: Record<string, unknown> }).props

    expect(props.initialTab).toBe('signup')
    expect(props.initialCtx).toEqual({ redirect: '/spots/pointe-du-raz' })
  })

  it("une cible externe est neutralisée (anti open-redirect toujours en place)", async () => {
    const RegisterPage = (await import('@/app/auth/register/page')).default
    const element = await RegisterPage({
      searchParams: Promise.resolve({ redirect: 'https://evil.example/x' }),
    })
    const props = (element as unknown as { props: Record<string, unknown> }).props
    expect(props.initialCtx).toEqual({ redirect: '/tarifs' })
  })

  it("aucun CTA « créer un compte » ne pointe encore vers /auth/login", () => {
    // Surfaces corrigées au Bloc 1. Les liens « Connecte-toi » assumés (header,
    // menu mobile, « Tu as déjà un carnet ? ») ne sont PAS dans cette liste :
    // eux s'adressent à quelqu'un qui a déjà un compte, et /auth/login est
    // exactement la bonne page pour lui.
    const files = [
      'app/(marketing)/tarifs/page.tsx',
      'app/(marketing)/tarifs/pricing-cards.tsx',
      'components/map/SpotPopup.tsx',
    ]
    for (const f of files) {
      const src = read(f)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      expect(src, `${f} renvoie encore un anonyme vers la connexion`).not.toContain(
        '/auth/login',
      )
      expect(src, `${f} utilise encore buildLoginRedirect`).not.toContain(
        'buildLoginRedirect',
      )
    }
  })
})
