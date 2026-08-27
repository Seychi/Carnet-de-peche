import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Sprint 90, Bloc 3 — le verrou des deux défauts que ce sprint a corrigés.
 *
 * Ils étaient revenus parce que rien ne les surveillait :
 *  - 9 routes applicatives indexables, qui mangeaient du budget de crawl alors que
 *    305 pages « détectées non explorées » attendaient leur tour (rapport GSC 23/08) ;
 *  - 4 pages publiques sans URL canonique, sur 17 « pages en double sans URL
 *    canonique sélectionnée par l'utilisateur » au même rapport.
 *
 * Deux règles, une par groupe de routes :
 *
 *  1. `(marketing)` — une page publique doit porter SOIT une `alternates.canonical`,
 *     SOIT un `robots` en `index: false`. Sans l'un des deux, Google choisit sa
 *     canonique tout seul et se trompe sur les variantes de query.
 *  2. `(app)` et `auth` — une page applicative doit porter `robots: { index: false }`
 *     OU tomber dans le `disallow` de `app/robots.ts`.
 *
 * ★ Le `disallow` est LU depuis `app/robots.ts`, jamais recopié : si quelqu'un
 * retire un préfixe du fichier, ce test doit se resserrer tout seul, pas continuer
 * à valider sur une copie périmée.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// ─── Lecture du disallow réel ────────────────────────────────────────────────

/** Extrait le tableau `disallow` de `app/robots.ts` sans exécuter le module. */
function readDisallow(): string[] {
  const src = fs.readFileSync(path.join(ROOT, 'app/robots.ts'), 'utf8')
  const block = src.match(/disallow\s*:\s*\[([^\]]*)\]/)
  if (!block) throw new Error("Impossible de lire le `disallow` de app/robots.ts")
  return [...block[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] ?? m[2])
}

// ─── Parcours des pages ──────────────────────────────────────────────────────

function walkPages(dirRel: string): string[] {
  const abs = path.join(ROOT, dirRel)
  if (!fs.existsSync(abs)) return []
  const out: string[] = []
  const stack = [abs]
  while (stack.length > 0) {
    const dir = stack.pop()!
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else if (entry.name === 'page.tsx') out.push(full)
    }
  }
  return out.sort()
}

/** Chemin d'URL d'un fichier page : les groupes `(xxx)` ne comptent pas. */
function routeOf(absPage: string): string {
  const rel = path.relative(ROOT, absPage).split(path.sep).join('/')
  const segs = rel
    .replace(/^app\//, '')
    .replace(/\/page\.tsx$/, '')
    .split('/')
    .filter((s) => s.length > 0 && !(s.startsWith('(') && s.endsWith(')')))
  return '/' + segs.join('/')
}

/**
 * Le source à inspecter pour une page : le `page.tsx` ET son `layout.tsx` voisin.
 *
 * ★ Les deux, et ce n'est pas du zèle. Une page `'use client'` ne PEUT PAS exporter
 * `metadata` (l'export serait ignoré en silence) : la convention du repo est alors
 * de le poser dans le layout voisin. C'est le cas de `/auth/reset-password`, et le
 * brief du sprint 90 s'est justement trompé de fichier dessus. Un test qui ne
 * regarderait que `page.tsx` produirait un faux positif sur cette page.
 */
function metadataSourceOf(absPage: string): string {
  const layout = path.join(path.dirname(absPage), 'layout.tsx')
  return (
    fs.readFileSync(absPage, 'utf8') +
    (fs.existsSync(layout) ? '\n' + fs.readFileSync(layout, 'utf8') : '')
  )
}

/**
 * Retire les commentaires, pour qu'une phrase du genre « cette page n'a pas de
 * canonical » ne soit pas prise pour une balise. Les blocs sont remplacés par des
 * espaces et non supprimés, afin de ne pas coller deux lignes de code entre elles.
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (b) => b.replace(/[^\n]/g, ' '))
    .split('\n')
    .map((l) => (/^\s*\/\//.test(l) ? '' : l))
    .join('\n')
}

/**
 * ★ Cherche le mot `canonical`, pas `canonical:`.
 *
 * Trois pages du repo écrivent `alternates: { canonical }` en propriété abrégée,
 * la valeur ayant été calculée juste au-dessus (`/especes/[slug]`, `/peche/[...slug]`,
 * `/spots`). Une regex sur `canonical\s*:` les déclarait fautives à tort : c'est le
 * premier résultat qu'a donné ce test, et c'est le détecteur qui avait tort, pas
 * les pages. D'où le passage par `stripComments` plutôt qu'un motif plus étroit.
 */
const hasCanonical = (src: string) => /\bcanonical\b/.test(stripComments(src))
const hasNoindex = (src: string) => /index\s*:\s*false/.test(stripComments(src))

/** Vrai si la route tombe dans un préfixe du disallow. */
function isDisallowed(route: string, disallow: string[]): boolean {
  return disallow.some((d) => route === d || route === d.replace(/\/$/, '') || route.startsWith(d))
}

// ─── Les deux verrous ────────────────────────────────────────────────────────

// `unsubscribe` porte déjà un noindex et vit hors du sitemap ; `c/[slug]` calcule
// son `robots` à l'exécution selon la visibilité de la prise partagée. Les deux
// sont des exceptions documentées, pas des oublis.
const MARKETING_EXCLUS = ['/unsubscribe', '/c/[slug]']

describe('verrou SEO : toute page publique a une canonique ou un noindex', () => {
  it('aucune page de (marketing) ne laisse Google choisir sa canonique', () => {
    const fautives = walkPages('app/(marketing)')
      .filter((p) => !MARKETING_EXCLUS.includes(routeOf(p)))
      .filter((p) => {
        const src = metadataSourceOf(p)
        return !hasCanonical(src) && !hasNoindex(src)
      })
      .map(routeOf)

    expect(
      fautives,
      `\nCes pages publiques n'ont ni \`alternates.canonical\` ni \`robots: { index: false }\` :\n` +
        fautives.map((r) => `  ⛔ ${r}`).join('\n') +
        `\n\nSans canonique, Google en choisit une seul et se trompe sur les variantes de\n` +
        `query (\`?utm_*\`, \`?redirect=\`…), ce qui produit des « pages en double sans URL\n` +
        `canonique sélectionnée par l'utilisateur » : il y en avait 17 au 23/08.\n` +
        `Ajoute \`alternates: { canonical: 'https://www.carnet-de-peche.com/<chemin>' }\`,\n` +
        `ou un \`robots: { index: false, follow: false }\` si la page n'a rien à faire dans l'index.\n`,
    ).toEqual([])
  })
})

describe('verrou SEO : aucune route applicative ne mange le budget de crawl', () => {
  it('toute page de (app) est en noindex ou dans le disallow de robots.ts', () => {
    const disallow = readDisallow()
    const fautives = walkPages('app/(app)')
      .filter((p) => !hasNoindex(metadataSourceOf(p)) && !isDisallowed(routeOf(p), disallow))
      .map(routeOf)

    expect(
      fautives,
      `\nCes routes applicatives sont explorables ET indexables :\n` +
        fautives.map((r) => `  ⛔ ${r}`).join('\n') +
        `\n\nChaque page applicative indexée prend du budget de crawl aux pages SEO : au\n` +
        `23/08, 89,4 % du budget partait en réactualisation et 305 pages attendaient\n` +
        `d'être explorées. Pose \`robots: { index: false, follow: false }\` dans le\n` +
        `\`metadata\` de la page (ou de son \`layout.tsx\` si la page est \`'use client'\`).\n` +
        `\n⚠️ NE PAS la mettre au \`disallow\` de robots.ts pour aller plus vite : une page\n` +
        `bloquée au crawl ne peut pas voir son noindex et resterait indexée.\n`,
    ).toEqual([])
  })

  it('les pages de auth/ hors callback sont couvertes elles aussi', () => {
    const disallow = readDisallow()
    const fautives = walkPages('app/auth')
      .filter((p) => {
        const src = metadataSourceOf(p)
        // `/auth/login` et `/auth/register` sont en `Allow` explicite : elles ont le
        // droit d'être explorées, et login porte un noindex + canonical assumés.
        return !hasNoindex(src) && !hasCanonical(src) && !isDisallowed(routeOf(p), disallow)
      })
      .map(routeOf)

    expect(fautives, `\nPages auth sans canonique ni noindex : ${fautives.join(', ')}\n`).toEqual([])
  })
})

describe('méta : les verrous mordent', () => {
  it('le disallow est bien lu depuis app/robots.ts et non recopié', () => {
    const disallow = readDisallow()
    // Si quelqu'un vide le tableau, le test ci-dessus se resserre au lieu de mentir.
    expect(disallow.length).toBeGreaterThan(0)
    expect(disallow).toContain('/carnet')
    expect(disallow).toContain('/profil')
  })

  it('une page inventée sans canonique ni noindex serait bien détectée', () => {
    const src = "export const metadata = { title: 'Test' }"
    expect(hasCanonical(src)).toBe(false)
    expect(hasNoindex(src)).toBe(false)
  })

  it('un noindex posé dans le layout voisin est bien vu (cas /auth/reset-password)', () => {
    const page = path.join(ROOT, 'app/auth/reset-password/page.tsx')
    expect(fs.readFileSync(page, 'utf8')).toMatch(/^["']use client["']/)
    // Le page.tsx seul n'a rien : c'est le layout qui porte le noindex.
    expect(hasNoindex(fs.readFileSync(page, 'utf8'))).toBe(false)
    expect(hasNoindex(metadataSourceOf(page))).toBe(true)
  })
})
