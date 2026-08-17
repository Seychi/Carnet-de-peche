import { describe, it, expect, vi } from 'vitest'
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// `tsconfig.json` est en `jsx: preserve` : esbuild (transformeur de Vitest) compile
// donc le JSX vers `React.createElement` sans importer React. Hors bundler Next, il
// faut fournir le global. Shim de test uniquement, aucun effet sur le build.
;(globalThis as unknown as { React: typeof React }).React = React
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * Sprint 84, Bloc 1 — le header public doit rester 100 % statique.
 *
 * Deux niveaux de garde :
 *  1. scan de source : `HeaderPublic` ne doit jamais retoucher aux cookies, et les
 *     deux consommateurs (layout marketing + 404) doivent l'utiliser lui, pas
 *     l'ancien `Header` serveur ;
 *  2. rendu SSR réel de `HeaderAuthSlot` : l'invariant de sécurité du sprint est que
 *     le HTML mis en cache ne contienne AUCUNE donnée utilisateur. On le prouve en
 *     rendant le composant sans effets (comme le fait le serveur) et en vérifiant
 *     qu'il produit la variante anonyme, et elle seule.
 *
 * Environnement Vitest = `node` (pas de jsdom, cf vitest.config.ts) : on rend avec
 * `react-dom/server`, ce qui correspond exactement à ce que le serveur produit.
 */

const here = path.dirname(fileURLToPath(import.meta.url))
const layoutDir = path.resolve(here, '..') // components/layout
const appDir = path.resolve(here, '../../../app')

const read = (p: string) => readFileSync(p, 'utf8')

/**
 * Retire commentaires de bloc et de ligne : les gardes ci-dessous portent sur le
 * CODE, pas sur la prose. Sans ça, un commentaire qui cite `@/lib/supabase/server`
 * pour expliquer pourquoi on ne l'importe pas ferait échouer le test.
 */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

// --- mocks : on isole HeaderAuthSlot de Next, de Supabase et des menus ----------

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: unknown }) =>
    createElement('a', { href }, children as never),
}))

vi.mock('@/lib/supabase/client', () => ({
  // Aucun effet ne tourne en rendu serveur : ce mock ne doit jamais être appelé.
  createClient: () => {
    throw new Error('createClient() appelé pendant le rendu serveur du header')
  },
}))

vi.mock('../UserMenu', () => ({
  UserMenu: ({ username, avatarUrl }: { username: string | null; avatarUrl: string | null }) =>
    createElement('span', { 'data-usermenu': `${username ?? ''}|${avatarUrl ?? ''}` }),
}))

vi.mock('@/components/mobile-nav', () => ({
  MobileNav: ({ isAuthenticated, username }: { isAuthenticated?: boolean; username?: string | null }) =>
    createElement('span', {
      'data-mobilenav': String(!!isAuthenticated),
      'data-mobilenav-username': username ?? '',
    }),
}))

describe('HeaderPublic : arbre serveur sans cookies (sprint 84)', () => {
  const src = code(read(path.join(layoutDir, 'HeaderPublic.tsx')))

  it('n’importe ni le client Supabase serveur ni next/headers', () => {
    expect(src).not.toMatch(/@\/lib\/supabase\/server/)
    expect(src).not.toMatch(/next\/headers/)
    expect(src).not.toMatch(/\bcookies\s*\(/)
  })

  it('n’est pas asynchrone (aucune lecture de requête à attendre)', () => {
    expect(src).not.toMatch(/export\s+async\s+function\s+HeaderPublic/)
  })

  it('délègue l’état connecté à HeaderAuthSlot', () => {
    expect(src).toContain('HeaderAuthSlot')
  })
})

describe('HeaderAuthSlot : composant client, session lue sans aller-retour', () => {
  const raw = read(path.join(layoutDir, 'HeaderAuthSlot.tsx'))
  const src = code(raw)

  it('est marqué « use client »', () => {
    const firstLine = raw.split('\n').find((l) => l.trim().length > 0)
    expect(firstLine?.trim()).toBe("'use client'")
  })

  it('lit la session avec getSession() et jamais avec getUser()', () => {
    expect(src).toContain('auth.getSession()')
    expect(src).not.toMatch(/auth\.getUser\s*\(/)
  })

  it('utilise le client NAVIGATEUR, pas le client serveur', () => {
    expect(src).toContain("@/lib/supabase/client")
    expect(src).not.toContain('@/lib/supabase/server')
  })

  it('réserve la largeur : la variante anonyme reste dans le flux, la connectée est superposée', () => {
    // Anti-CLS. Si un jour quelqu’un remonte la variante connectée dans le flux,
    // la largeur du header redeviendra dépendante de l’état et la nav bougera.
    expect(src).toContain('absolute inset-y-0 right-0 w-max')
    expect(src).toContain('invisible')
  })
})

describe('rendu serveur du header : variante anonyme, aucune donnée utilisateur', () => {
  it('produit les deux CTA anonymes et rien d’autre', async () => {
    const { HeaderAuthSlot } = await import('../HeaderAuthSlot')
    const html = renderToStaticMarkup(createElement(HeaderAuthSlot))

    // Ce que le CDN et Googlebot doivent voir.
    expect(html).toContain('Connexion')
    expect(html).toContain('Créer mon carnet')
    expect(html).toContain('href="/auth/login"')
    expect(html).toContain('href="/auth/register"')

    // Ce qu’ils ne doivent JAMAIS voir : le pont vers l’app, le menu utilisateur,
    // un pseudo, une URL d’avatar. C’est l’invariant de sécurité du sprint 84.
    expect(html).not.toContain('Mon carnet')
    expect(html).not.toContain('href="/home"')
    expect(html).not.toContain('data-usermenu')
    expect(html).toContain('data-mobilenav="false"')
    expect(html).toContain('data-mobilenav-username=""')
  })

  it('ne masque pas la variante anonyme au rendu serveur', () => {
    // `invisible` ne doit apparaître qu’une fois connecté, après hydratation.
    return import('../HeaderAuthSlot').then(({ HeaderAuthSlot }) => {
      const html = renderToStaticMarkup(createElement(HeaderAuthSlot))
      expect(html).not.toContain('invisible')
      expect(html).not.toContain('aria-hidden')
      expect(html).not.toContain('inert')
    })
  })
})

describe('consommateurs du header public', () => {
  it('le layout (marketing) monte HeaderPublic et plus l’ancien Header serveur', () => {
    const src = read(path.join(appDir, '(marketing)', 'layout.tsx'))
    expect(src).toContain('HeaderPublic')
    expect(src).not.toMatch(/from '@\/components\/layout\/Header'/)
    expect(src).not.toMatch(/<Header\s*\/>/)
  })

  it('la page 404 monte HeaderPublic', () => {
    const src = read(path.join(appDir, 'not-found.tsx'))
    expect(src).toContain('HeaderPublic')
    expect(src).not.toMatch(/from '@\/components\/layout\/Header'/)
    expect(src).not.toMatch(/<Header\s*\/>/)
  })

  it('le layout (map) garde volontairement le Header serveur (/carte est force-dynamic)', () => {
    // Choix délibéré du sprint 84 : rien à gagner sur une page déjà dynamique,
    // et on limite le rayon d’explosion du changement.
    const src = read(path.join(appDir, '(map)', 'layout.tsx'))
    expect(src).toMatch(/from '@\/components\/layout\/Header'/)
    expect(src).toMatch(/<Header\s*\/>/)
  })
})
