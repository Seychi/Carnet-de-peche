import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { createElement, Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// `tsconfig.json` est en `jsx: preserve` : esbuild compile le JSX des pages vers
// `React.createElement` sans importer React. Shim de test uniquement.
;(globalThis as unknown as { React: typeof React }).React = React

/**
 * Sprint 85, Bloc 1 — `/auth/login` sort de l'index.
 *
 * LE FAIT : 23 personnes sur 90 jours ENTRAIENT sur le site par la page de
 * connexion (4e page d'entrée), parce que `app/sitemap.ts` la déclarait à Google.
 * Quelqu'un qui arrive d'un moteur sur une page de *connexion* n'a par définition
 * pas de compte.
 *
 * Ce test ne se contente pas de lire l'objet `metadata` : il fait passer cet objet
 * par LE MÊME résolveur et LE MÊME générateur de balises que Next utilise au rendu
 * (`resolveRobots` + `BasicMeta`), et vérifie la balise HTML produite. C'est la
 * seule preuve qui vaille : un `robots` mal formé (`{ noindex: true }`, une chaîne,
 * un booléen) passerait une assertion sur l'objet et ne produirait RIEN dans le
 * HTML.
 *
 * ⚠️ Deux invariants gardés en même temps :
 *  - `follow` reste vrai, et `app/robots.ts` ne doit PAS passer la page en
 *    `disallow` : une page bloquée au crawl ne peut pas lire son propre `noindex`
 *    et resterait indexée ;
 *  - le canonical du sprint 79 est conservé.
 */

// Le composant client de la page n'a rien à voir avec ses métadonnées, et il est
// lourd (PostHog, next/navigation, server actions). On l'écarte du graphe d'import.
vi.mock('@/app/auth/login/login-client', () => ({
  LoginPageClient: () => null,
}))

// Idem pour /auth/register, qui rend le même client.
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }))

/** Rend les balises <meta> de base exactement comme Next le fait au rendu. */
async function renderRobotsMeta(robots: unknown): Promise<string> {
  const { resolveRobots } = await import(
    'next/dist/lib/metadata/resolvers/resolve-basics.js'
  )
  const { BasicMeta } = await import('next/dist/lib/metadata/generate/basic.js')
  const resolved = resolveRobots(robots as never)
  const elements = BasicMeta({
    metadata: { title: null, robots: resolved } as never,
  })
  return renderToStaticMarkup(createElement(Fragment, null, ...elements))
}

describe('/auth/login — noindex, follow', () => {
  it('le HTML rendu porte bien <meta name="robots" content="noindex, follow">', async () => {
    const { metadata } = await import('@/app/auth/login/page')
    const html = await renderRobotsMeta(metadata.robots)
    expect(html).toContain('<meta name="robots" content="noindex, follow"/>')
  })

  it('conserve le canonical posé au sprint 79', async () => {
    const { metadata } = await import('@/app/auth/login/page')
    expect(metadata.alternates?.canonical).toBe(
      'https://www.carnet-de-peche.com/auth/login',
    )
  })

  it("la page d'INSCRIPTION, elle, reste indexable", async () => {
    const { metadata } = await import('@/app/auth/register/page')
    // Aucune directive robots = indexable par défaut. C'est la bonne porte.
    expect(metadata.robots).toBeUndefined()
    const html = await renderRobotsMeta(metadata.robots)
    expect(html).not.toContain('name="robots"')
  })

  it('la page rend toujours le formulaire (régression interdite : on doit pouvoir se connecter)', async () => {
    // Le `noindex` est une métadonnée : il ne doit rien changer au rendu. La page
    // serveur doit continuer de produire son composant client, avec `inviteOnly`.
    const LoginPage = (await import('@/app/auth/login/page')).default
    const element = LoginPage() as unknown as { props: Record<string, unknown> }
    expect(element).toBeTruthy()
    expect(element.props).toHaveProperty('inviteOnly')
  })

  it("robots.txt garde /auth/login en Allow : sans crawl, pas de lecture du noindex", async () => {
    const robotsTxt = (await import('@/app/robots')).default
    const rules = robotsTxt().rules
    const rule = Array.isArray(rules) ? rules[0] : rules
    const disallow = ([] as string[]).concat(rule.disallow ?? [])
    expect(disallow.some((p) => p.startsWith('/auth/login'))).toBe(false)
    const allow = ([] as string[]).concat(rule.allow ?? [])
    expect(allow).toContain('/auth/login')
  })
})
