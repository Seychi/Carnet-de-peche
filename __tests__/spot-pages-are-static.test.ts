import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Sprint 84, Bloc 3 — verrou de non-régression des DEUX pages spots.
 *
 * Le Bloc 1 a rendu le layout `(marketing)` statique, mais `/spots` et
 * `/spots/[slug]` restaient dynamiques PAR ELLES-MÊMES : `auth.getUser()`,
 * `getUserTier()`, et surtout quatre modules qui atteignaient les cookies par la
 * bande sans que le brief les ait vus (`SpotActivitySection`,
 * `lib/conditions/spot-forecast`, `lib/conditions/tide-calibration`,
 * `lib/scoring/personal`). C'est ce dernier point qui rend ce verrou nécessaire :
 * la régression ne viendra pas d'un `getUser()` bien visible dans la page, elle
 * viendra d'un composant tiers qui se met à lire la session.
 *
 * Même parseur que `__tests__/marketing-layout-is-static.test.ts` (Bloc 0), racines
 * différentes. Limite assumée identique : seuls les imports STATIQUES sont suivis.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const ROOTS = ['app/(marketing)/spots/page.tsx', 'app/(marketing)/spots/[slug]/page.tsx']

const FORBIDDEN_BARE = ['next/headers']
const FORBIDDEN_FILES = ['lib/supabase/server.ts', 'lib/auth/tier.ts']
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

function isClientBoundary(source: string): boolean {
  const first = stripComments(source)
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  return first ? /^['"]use client['"]/.test(first) : false
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
  else if (spec.startsWith('./') || spec.startsWith('../')) base = path.resolve(path.dirname(fromFile), spec)
  else return null

  const candidates = [
    base,
    ...EXTENSIONS.map((e) => base + e),
    ...EXTENSIONS.map((e) => path.join(base, 'index' + e)),
  ]
  for (const c of candidates) {
    if (EXTENSIONS.some((e) => c.endsWith(e)) && fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  return null
}

type Violation = { chain: string[]; target: string }

function findViolations(rootRel: string): Violation[] {
  const rootAbs = path.join(ROOT, rootRel)
  if (!fs.existsSync(rootAbs)) throw new Error(`Racine introuvable : ${rootRel}`)

  const violations: Violation[] = []
  const visited = new Set<string>()
  const stack: { file: string; chain: string[] }[] = [{ file: rootAbs, chain: [rootRel] }]

  while (stack.length > 0) {
    const { file, chain } = stack.pop()!
    if (visited.has(file)) continue
    visited.add(file)

    const source = fs.readFileSync(file, 'utf8')
    if (isClientBoundary(source) && file !== rootAbs) continue

    for (const { spec, typeOnly } of extractImports(source)) {
      if (typeOnly) continue

      if (FORBIDDEN_BARE.some((f) => spec === f || spec.startsWith(f + '/'))) {
        violations.push({ chain: [...chain, spec], target: spec })
        continue
      }
      const resolved = resolveLocal(spec, file)
      if (!resolved) continue
      const resolvedRel = rel(resolved)
      if (FORBIDDEN_FILES.includes(resolvedRel)) {
        violations.push({ chain: [...chain, resolvedRel], target: resolvedRel })
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
    `\`${rootRel}\` est redevenue DYNAMIQUE : ${violations.length} chemin(s) d'import atteignent`,
    "la session sans passer par une frontière 'use client'.",
    '',
    'Conséquence : `revalidate` et `generateStaticParams` redeviennent inertes, le CDN',
    'ne sert plus rien, et le TTFB repart à ~1,2 s sur la page qui porte 80 % des clics.',
    '',
  ]
  for (const v of violations) {
    lines.push('  Chemin fautif :')
    v.chain.forEach((f, i) => {
      lines.push(`    ${'  '.repeat(i)}${i === 0 ? '' : '→ '}${f}${i === v.chain.length - 1 ? '   ⛔' : ''}`)
    })
    lines.push('')
  }
  lines.push(
    "Correctif : lire la donnée avec `createAnonClient()` (@/lib/supabase/anon) si elle",
    'est publique, ou la déplacer dans `/api/spots/[slug]/viewer` si elle dépend du',
    'visiteur (cf components/spots/viewer/).',
    '',
  )
  return lines.join('\n')
}

describe('verrou : les pages spots ne lisent aucun cookie côté serveur', () => {
  for (const rootRel of ROOTS) {
    it(`${rootRel} n'atteint ni les cookies ni getUserTier`, () => {
      const violations = findViolations(rootRel)
      expect(violations, format(rootRel, violations)).toEqual([])
    })
  }

  it('la fiche pré-génère une liste COURTE et garde dynamicParams', async () => {
    const source = fs.readFileSync(path.join(ROOT, ROOTS[1]), 'utf8')
    expect(source).toMatch(/export const dynamicParams = true/)

    // 607 fiches en base : les générer toutes au build, c'est des milliers d'appels
    // Open-Meteo et EMODnet en quelques minutes, donc un build qui casse sur un
    // rate-limit. Ce test fixe le plafond, il n'est pas décoratif.
    const block = source.match(/export function generateStaticParams\(\)[\s\S]*?\n}/)?.[0]
    expect(block, 'generateStaticParams introuvable').toBeTruthy()
    const slugs = block!.match(/'[a-z0-9-]+'/g) ?? []
    expect(slugs.length).toBeGreaterThan(0)
    expect(
      slugs.length,
      'Pré-générer plus d’une poignée de fiches expose le build au rate-limit Open-Meteo.',
    ).toBeLessThanOrEqual(20)
  })

  it('la fiche garde revalidate = 1800 (fraîcheur de la marée du jour)', () => {
    const source = fs.readFileSync(path.join(ROOT, ROOTS[1]), 'utf8')
    expect(source).toMatch(/export const revalidate = 1800/)
  })
})

describe('méta : le parseur mord toujours', () => {
  it('détecte le cas témoin components/layout/Header.tsx', () => {
    const violations = findViolations('components/layout/Header.tsx')
    expect(violations.map((v) => v.target)).toContain('lib/supabase/server.ts')
  })

  it('détecte lib/auth/tier.ts comme lecteur de session', () => {
    const violations = findViolations('lib/auth/tier.ts')
    expect(violations.map((v) => v.target)).toContain('lib/supabase/server.ts')
  })
})
