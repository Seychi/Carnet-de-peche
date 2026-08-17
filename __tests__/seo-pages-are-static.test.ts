// Sprint 84 — verrou de NIVEAU PAGE, complément de `marketing-layout-is-static`.
//
// Le verrou du Bloc 0 protège les racines du groupe : `app/(marketing)/layout.tsx` et
// `app/not-found.tsx`. Il est nécessaire mais pas suffisant : une page peut se rendre
// dynamique TOUTE SEULE en lisant les cookies dans son propre chargement de données,
// et le layout n'y peut rien.
//
// C'est exactement ce qui restait après le Bloc 1. Mesuré sur le build du 17/08 :
//   - `/` lisait les cookies via `lib/marketing/home-data` → `lib/conditions/spot-forecast`
//     (`readCache` sur `weather_cache`, pourtant en policy `using (true)`) ;
//   - `/especes/[slug]` par CINQ chemins (compteur de prises, score, top-spots, perso) ;
//   - `/peche/[...slug]` dans `fetchData` ;
//   - `/guides/[slug]` via le composant MDX `<SpotCard>`, ce qui explique le symptôme
//     le plus déroutant du sprint : 2 guides sur 6 se pré-rendaient. Les 2 sans
//     `<SpotCard>` dans leur MDX. La cause n'était pas la page, mais son CONTENU.
//
// Ces 4 routes sont les témoins de `pnpm check:prerender`. Ce test verrouille la même
// exigence au niveau du CODE, sans payer un build de 3 minutes.
//
// 📌 À COMPLÉTER : `/spots` et `/spots/[slug]` relèvent du Bloc 3 (workstream parallèle).
// Les ajouter à ROUTES dès qu'il est livré — ce sont les pages les plus lourdes du site.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Les 4 routes témoins du critère d'acceptation du sprint. */
const ROUTES = [
  'app/(marketing)/page.tsx',
  'app/(marketing)/especes/[slug]/page.tsx',
  'app/(marketing)/guides/[slug]/page.tsx',
  'app/(marketing)/peche/[...slug]/page.tsx',
]

const FORBIDDEN_BARE = ['next/headers']
const FORBIDDEN_FILES = ['lib/supabase/server.ts']
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

const toPosix = (p: string) => p.split(path.sep).join('/')
const rel = (abs: string) => toPosix(path.relative(ROOT, abs))

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => (/^\s*\/\//.test(line) ? '' : line))
    .join('\n')
}

/** Une frontière `'use client'` arrête la descente : sous elle, tout part au navigateur. */
function isClientBoundary(source: string): boolean {
  const first = stripComments(source)
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  return first ? /^['"]use client['"]/.test(first) : false
}

/**
 * Une Server Action (`'use server'`) arrête aussi la descente, et c'est VOULU : elle
 * s'exécute à la requête, en réponse à un appel explicite du navigateur, jamais au
 * moment du pré-rendu. Elle a donc parfaitement le droit de lire les cookies — c'est
 * même le mécanisme par lequel les deltas connectés reviennent (cf
 * `app/actions/species-insights.ts`). L'assimiler à une lecture serveur ferait échouer
 * le test sur le correctif lui-même.
 */
function isServerActionBoundary(source: string): boolean {
  const first = stripComments(source)
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  return first ? /^['"]use server['"]/.test(first) : false
}

type Spec = { spec: string; typeOnly: boolean }

function extractImports(source: string): Spec[] {
  const code = stripComments(source)
  const out: Spec[] = []
  const fromRe = /^[ \t]*(?:import|export)\b([^;]*?)\bfrom\s*['"]([^'"]+)['"]/gm
  let m: RegExpExecArray | null
  while ((m = fromRe.exec(code)) !== null) {
    out.push({ spec: m[2], typeOnly: /^\s*type\b/.test(m[1]) })
  }
  const bareRe = /^[ \t]*import\s*['"]([^'"]+)['"]/gm
  while ((m = bareRe.exec(code)) !== null) out.push({ spec: m[1], typeOnly: false })
  return out
}

function resolveLocal(spec: string, fromFile: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = path.join(ROOT, spec.slice(2))
  else if (spec.startsWith('./') || spec.startsWith('../'))
    base = path.resolve(path.dirname(fromFile), spec)
  else return null

  const candidates = [
    base,
    ...EXTENSIONS.map((e) => base + e),
    ...EXTENSIONS.map((e) => path.join(base, 'index' + e)),
  ]
  for (const c of candidates) {
    if (EXTENSIONS.some((e) => c.endsWith(e)) && fs.existsSync(c) && fs.statSync(c).isFile()) {
      return c
    }
  }
  return null
}

type Violation = { chain: string[]; reason: string }

function findViolations(rootRel: string): Violation[] {
  const rootAbs = path.join(ROOT, rootRel)
  if (!fs.existsSync(rootAbs)) {
    throw new Error(`Route introuvable : ${rootRel}. Mettre ROUTES à jour si elle a été renommée.`)
  }

  const violations: Violation[] = []
  const visited = new Set<string>()
  const stack: { file: string; chain: string[] }[] = [{ file: rootAbs, chain: [rootRel] }]

  while (stack.length > 0) {
    const { file, chain } = stack.pop()!
    if (visited.has(file)) continue
    visited.add(file)

    const source = fs.readFileSync(file, 'utf8')
    if (file !== rootAbs && (isClientBoundary(source) || isServerActionBoundary(source))) continue

    for (const { spec, typeOnly } of extractImports(source)) {
      if (typeOnly) continue

      if (FORBIDDEN_BARE.some((f) => spec === f || spec.startsWith(f + '/'))) {
        violations.push({
          chain: [...chain, spec],
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
          reason: `\`${resolvedRel}\` appelle \`cookies()\` : la route devient dynamique`,
        })
        continue
      }
      if (!visited.has(resolved)) stack.push({ file: resolved, chain: [...chain, resolvedRel] })
    }
  }
  return violations
}

function format(rootRel: string, violations: Violation[]): string {
  const lines = [
    '',
    `${rootRel} se rend DYNAMIQUE toute seule : ${violations.length} chemin(s) d'import`,
    'atteignent les cookies sans passer par une frontière \'use client\' ou \'use server\'.',
    '',
    'Conséquence : `revalidate` et `generateStaticParams` sont inertes sur cette route,',
    'le build ne la pré-rend pas, et `pnpm check:prerender` échoue.',
    '',
  ]
  for (const v of violations) {
    lines.push('  Chemin fautif :')
    v.chain.forEach((f, i) => {
      lines.push(`    ${'  '.repeat(i)}${i === 0 ? '' : '→ '}${f}${i === v.chain.length - 1 ? '   ⛔' : ''}`)
    })
    lines.push(`    Motif : ${v.reason}`, '')
  }
  lines.push(
    'Correctif : si la donnée est PUBLIQUE, la lire avec `createAnonClient()` de',
    '`@/lib/supabase/anon` (aucun cookie). Si elle dépend du visiteur, la sortir du',
    "rendu serveur : composant client + Server Action, comme",
    '`components/especes/species-score-live.tsx`.',
    ''
  )
  return lines.join('\n')
}

describe('verrou : les pages SEO témoins ne lisent aucun cookie', () => {
  for (const route of ROUTES) {
    it(`${route} n'atteint ni lib/supabase/server ni next/headers`, () => {
      const violations = findViolations(route)
      expect(violations, format(route, violations)).toEqual([])
    })
  }
})

// Méta-tests : un verrou qui ne mord pas est pire que pas de verrou.
describe('méta : la détection mord vraiment', () => {
  it('détecte encore le cas témoin connu (components/layout/Header.tsx)', () => {
    // Header.tsx est le composant serveur historique qui lit l'auth. Il reste utilisé
    // par le groupe (map), volontairement dynamique : il doit donc continuer d'exister
    // ET d'être détecté. Si ce test casse, c'est le parseur qui a cessé de mordre.
    expect(fs.existsSync(path.join(ROOT, 'components/layout/Header.tsx'))).toBe(true)
    const v = findViolations('components/layout/Header.tsx')
    expect(v.map((x) => x.chain.at(-1))).toContain('lib/supabase/server.ts')
  })

  it("ne franchit ni la frontière 'use client' ni la frontière 'use server'", () => {
    expect(isClientBoundary("'use client'\nimport x from 'y'")).toBe(true)
    expect(isServerActionBoundary("'use server'\nimport x from 'y'")).toBe(true)
    expect(isClientBoundary("import x from 'y'")).toBe(false)
    expect(isServerActionBoundary("import x from 'y'")).toBe(false)
    // La Server Action des fiches espèces lit bien les cookies, volontairement :
    // c'est elle qui rapporte les deltas connectés après hydratation.
    const action = findViolations('app/actions/species-insights.ts')
    expect(action.length).toBeGreaterThan(0)
  })

  it('résout les alias @/* et les extensions implicites', () => {
    const from = path.join(ROOT, 'components/layout/Header.tsx')
    expect(rel(resolveLocal('@/lib/supabase/server', from)!)).toBe('lib/supabase/server.ts')
    expect(resolveLocal('next/link', from)).toBeNull()
  })
})
