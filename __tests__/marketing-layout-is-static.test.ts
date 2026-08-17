// Sprint 84, Bloc 0 — LE verrou anti-régression du sprint.
//
// Le fait mesuré : `app/(marketing)/layout.tsx` rendait un <Header /> qui appelait
// `createClient()` de `@/lib/supabase/server`, lequel appelle `cookies()` de
// `next/headers`. Un seul accès aux cookies dans l'arbre SERVEUR d'un layout rend
// dynamique TOUT le groupe de routes : `revalidate` et `generateStaticParams`
// deviennent inertes, silencieusement. Résultat au build du 17/08 : 2 routes
// pré-rendues (/icon.svg, /robots.txt) et 0 fichier .html, pour 1 088 pages SEO.
//
// Ce test parcourt le graphe d'IMPORTS STATIQUES depuis les racines serveur du
// groupe (marketing) et échoue si un module atteint `lib/supabase/server` ou
// `next/headers` sans franchir de frontière `'use client'`. Il attrape la
// régression au niveau du code, sans avoir besoin d'un build de 3 minutes.
//
// Pourquoi la frontière `'use client'` arrête la descente : tout ce qui vit
// sous elle est compilé pour le navigateur. Un composant client ne PEUT pas
// importer `next/headers` (Next refuse au build), donc il ne peut pas rendre la
// route dynamique. C'est exactement le pattern de `components/marketing/
// HeroPrimaryCta.tsx`, que le Bloc 1 généralise au header.
//
// Limite assumée : seuls les imports STATIQUES sont suivis. Un
// `await import('@/lib/supabase/server')` au fond d'un composant serveur
// passerait sous le radar. C'est un cas qui n'existe pas dans le repo et qui
// serait de toute façon rattrapé par `pnpm check:prerender` après le build.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Racines à vérifier : les entrées SERVEUR qui enveloppent les pages SEO.
 * `app/(map)/layout.tsx` est volontairement absent : `/carte` est en
 * `force-dynamic` (choix délibéré du Bloc 1), il n'y a rien à protéger.
 */
const ROOTS = ['app/(marketing)/layout.tsx', 'app/not-found.tsx']

/** Spécificateurs nus interdits dans l'arbre serveur (rendent la route dynamique). */
const FORBIDDEN_BARE = ['next/headers']

/** Fichiers du repo interdits, en chemin relatif POSIX depuis la racine. */
const FORBIDDEN_FILES = ['lib/supabase/server.ts']

/** Extensions tentées pour la résolution d'un import sans extension. */
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

const toPosix = (p: string) => p.split(path.sep).join('/')
const rel = (abs: string) => toPosix(path.relative(ROOT, abs))

/**
 * Retire les commentaires susceptibles de contenir de faux imports.
 * - blocs `/* … *​/` (c'est là que vit le code commenté) ;
 * - lignes dont le PREMIER caractère non blanc est `//`.
 * On ne touche pas aux `//` en milieu de ligne, sinon on tronquerait les URLs
 * (`https://…`) présentes dans les chaînes.
 */
function stripComments(source: string): string {
  const withoutBlocks = source.replace(/\/\*[\s\S]*?\*\//g, '')
  return withoutBlocks
    .split('\n')
    .map((line) => (/^\s*\/\//.test(line) ? '' : line))
    .join('\n')
}

/** Un fichier est-il une frontière client ? (première instruction = 'use client') */
function isClientBoundary(source: string): boolean {
  const firstMeaningful = stripComments(source)
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  if (!firstMeaningful) return false
  return /^['"]use client['"]/.test(firstMeaningful)
}

type Spec = { spec: string; typeOnly: boolean }

/**
 * Extrait les spécificateurs des imports/ré-exports statiques.
 * Couvre : `import x from`, `import {a, b} from` (y compris multi-lignes),
 * `import * as ns from`, `import 'side-effect'`, `export {a} from`,
 * `export * from`, `export * as ns from`.
 * Le `[^;]*?` empêche un `export default function …` de « manger » l'import
 * suivant : un corps de fonction contient toujours un `;` ou n'a pas de `from`.
 */
function extractImports(source: string): Spec[] {
  const code = stripComments(source)
  const out: Spec[] = []

  const fromRe = /^[ \t]*(?:import|export)\b([^;]*?)\bfrom\s*['"]([^'"]+)['"]/gm
  let m: RegExpExecArray | null
  while ((m = fromRe.exec(code)) !== null) {
    out.push({ spec: m[2], typeOnly: /^\s*type\b/.test(m[1]) })
  }

  // Imports d'effet de bord : `import 'server-only'`
  const bareRe = /^[ \t]*import\s*['"]([^'"]+)['"]/gm
  while ((m = bareRe.exec(code)) !== null) {
    out.push({ spec: m[1], typeOnly: false })
  }

  return out
}

/** Résout un spécificateur local vers un fichier du repo, ou null. */
function resolveLocal(spec: string, fromFile: string): string | null {
  let base: string
  if (spec.startsWith('@/')) {
    base = path.join(ROOT, spec.slice(2))
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    base = path.resolve(path.dirname(fromFile), spec)
  } else {
    return null // paquet npm : hors du graphe repo
  }

  const candidates = [
    base,
    ...EXTENSIONS.map((e) => base + e),
    ...EXTENSIONS.map((e) => path.join(base, 'index' + e)),
  ]
  for (const c of candidates) {
    if (
      EXTENSIONS.some((e) => c.endsWith(e)) &&
      fs.existsSync(c) &&
      fs.statSync(c).isFile()
    ) {
      return c
    }
  }
  return null
}

type Violation = { chain: string[]; target: string; reason: string }

/**
 * Parcours en profondeur depuis une racine serveur.
 * `chain` est la suite de fichiers parcourus : c'est ce qui rend le message
 * d'échec exploitable dans six mois.
 */
function findViolations(rootRel: string): Violation[] {
  const rootAbs = path.join(ROOT, rootRel)
  if (!fs.existsSync(rootAbs)) {
    throw new Error(
      `Racine introuvable : ${rootRel}. Si le fichier a été renommé, mettre ROOTS à jour dans ce test.`
    )
  }

  const violations: Violation[] = []
  const visited = new Set<string>()
  const stack: { file: string; chain: string[] }[] = [
    { file: rootAbs, chain: [rootRel] },
  ]

  while (stack.length > 0) {
    const { file, chain } = stack.pop()!
    if (visited.has(file)) continue
    visited.add(file)

    const source = fs.readFileSync(file, 'utf8')

    // Frontière client : tout ce qui est en dessous part au navigateur.
    // On ne descend pas (sauf si c'est la racine elle-même, cas impossible ici
    // mais on le traite pour ne pas mentir silencieusement).
    if (isClientBoundary(source) && file !== rootAbs) continue

    for (const { spec, typeOnly } of extractImports(source)) {
      // Un type ne s'exécute pas : il disparaît à la compilation.
      if (typeOnly) continue

      if (FORBIDDEN_BARE.some((f) => spec === f || spec.startsWith(f + '/'))) {
        violations.push({
          chain: [...chain, spec],
          target: spec,
          reason: `\`${spec}\` lit la requête entrante : la route devient dynamique`,
        })
        continue
      }

      const resolved = resolveLocal(spec, file)
      if (!resolved) continue

      const resolvedRel = rel(resolved)
      if (FORBIDDEN_FILES.includes(resolvedRel)) {
        violations.push({
          chain: [...chain, resolvedRel],
          target: resolvedRel,
          reason: `\`${resolvedRel}\` appelle \`cookies()\` de \`next/headers\` : la route devient dynamique`,
        })
        continue
      }

      if (!visited.has(resolved)) {
        stack.push({ file: resolved, chain: [...chain, resolvedRel] })
      }
    }
  }

  return violations
}

function formatViolations(rootRel: string, violations: Violation[]): string {
  const lines = [
    '',
    `Le groupe (marketing) est rendu DYNAMIQUE : ${violations.length} chemin(s) d'import atteignent`,
    `les cookies depuis \`${rootRel}\` sans passer par une frontière 'use client'.`,
    '',
    'Conséquence : `revalidate` et `generateStaticParams` sont inertes sur TOUTES',
    'les pages du groupe, le build ne pré-rend rien, et le CDN sert',
    '`Cache-Control: private, no-store` sur les 1 088 pages SEO.',
    '',
  ]
  for (const v of violations) {
    lines.push('  Chemin fautif :')
    v.chain.forEach((f, i) => {
      const arrow = i === 0 ? '' : '→ '
      const flag = i === v.chain.length - 1 ? '   ⛔' : ''
      lines.push(`    ${'  '.repeat(i)}${arrow}${f}${flag}`)
    })
    lines.push(`    Motif : ${v.reason}`)
    lines.push('')
  }
  lines.push(
    'Correctif : déplacer la lecture d\'auth dans un composant client qui la fait',
    "après hydratation (pattern de `components/marketing/HeroPrimaryCta.tsx`), et",
    "garder l'arbre serveur du layout sans le moindre accès aux cookies.",
    ''
  )
  return lines.join('\n')
}

describe("verrou : l'arbre serveur du groupe (marketing) ne lit aucun cookie", () => {
  for (const rootRel of ROOTS) {
    it(`${rootRel} n'atteint ni lib/supabase/server ni next/headers`, () => {
      const violations = findViolations(rootRel)
      expect(violations, formatViolations(rootRel, violations)).toEqual([])
    })
  }
})

// Méta-tests : un verrou qui ne mord pas est pire que pas de verrou.
// Ils prouvent que les briques de détection font bien leur travail, pour qu'une
// future refonte du parseur ne transforme pas le test en tampon de complaisance.
describe('méta : les briques de détection mordent vraiment', () => {
  it("reconnaît une frontière 'use client', y compris après commentaires", () => {
    expect(isClientBoundary("'use client'\n\nimport x from 'y'")).toBe(true)
    expect(isClientBoundary('// un commentaire\n"use client"\n')).toBe(true)
    expect(isClientBoundary('/* bloc\n   multi-ligne */\n\n\'use client\'\n')).toBe(true)
    expect(isClientBoundary("import x from 'y'\n'use client'\n")).toBe(false)
    expect(isClientBoundary("import x from 'y'\n")).toBe(false)
  })

  it('extrait tous les styles d\'import statiques et ignore les types', () => {
    const specs = extractImports(
      [
        "import a from './a'",
        "import { b, c } from '@/b'",
        'import {',
        '  d,',
        "} from './d'",
        "import * as e from './e'",
        "import './side-effect'",
        "export { f } from './f'",
        "export * from './g'",
        "export * as h from './h'",
        "import type { T } from './types'",
        "export type { U } from './types-2'",
        "// import { z } from './commented-out'",
        "/* import { y } from './blocked-out' */",
      ].join('\n')
    ).filter((s) => !s.typeOnly)
    const found = specs.map((s) => s.spec)

    for (const expected of [
      './a',
      '@/b',
      './d',
      './e',
      './side-effect',
      './f',
      './g',
      './h',
    ]) {
      expect(found, `import manqué : ${expected}`).toContain(expected)
    }
    for (const excluded of ['./types', './types-2', './commented-out', './blocked-out']) {
      expect(found, `ne devrait pas être suivi : ${excluded}`).not.toContain(excluded)
    }
  })

  it('résout les alias @/*, les chemins relatifs et les extensions implicites', () => {
    const from = path.join(ROOT, 'components/layout/Header.tsx')
    expect(rel(resolveLocal('@/lib/supabase/server', from)!)).toBe('lib/supabase/server.ts')
    expect(rel(resolveLocal('./HeaderShell', from)!)).toBe('components/layout/HeaderShell.tsx')
    expect(rel(resolveLocal('../mobile-nav', from)!)).toBe('components/mobile-nav.tsx')
    expect(resolveLocal('next/link', from)).toBeNull()
  })

  it('détecte la violation sur un cas témoin connu (components/layout/Header.tsx)', () => {
    // Header.tsx est le composant serveur historique qui lit l'auth. Il reste
    // utilisé par le groupe (map), volontairement dynamique : il doit donc
    // continuer d'exister ET continuer d'être détecté comme lecteur de cookies.
    // Si ce méta-test casse, c'est le parseur qui a cessé de mordre.
    expect(fs.existsSync(path.join(ROOT, 'components/layout/Header.tsx'))).toBe(true)
    const violations = findViolations('components/layout/Header.tsx')
    expect(violations.map((v) => v.target)).toContain('lib/supabase/server.ts')
  })
})
