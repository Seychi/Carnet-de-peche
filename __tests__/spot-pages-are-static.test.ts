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

/**
 * Les commentaires de bloc sont remplacés par des ESPACES, pas supprimés : le
 * détecteur d'options de cache plus bas cite des numéros de ligne, et un
 * `.replace(…, '')` les décalerait en silence dès qu'un fichier porte un long
 * bandeau en tête (c'est le cas de la moitié de ce repo).
 */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, ' '))
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

/**
 * Sprint 88, Bloc 1 — le second trou de ce verrou.
 *
 * `findViolations` cherche une CIBLE D'IMPORT (les cookies). C'est excellent contre
 * la régression du sprint 84, et parfaitement aveugle à celle du sprint 88 : une
 * option de cache posée sur un `fetch` rend la route dynamique par un chemin qui
 * n'implique aucun import interdit. Il faut donc parcourir le même graphe, mais
 * chercher un MOTIF DANS LE SOURCE.
 *
 * Renvoie tous les fichiers du graphe d'imports SERVEUR d'une racine, avec les
 * mêmes règles que `findViolations` : imports statiques uniquement, on s'arrête à
 * la première frontière `'use client'` (au-delà, le code tourne dans le navigateur
 * et ne peut plus rien faire basculer).
 */
function collectServerGraph(rootRel: string): string[] {
  const rootAbs = path.join(ROOT, rootRel)
  if (!fs.existsSync(rootAbs)) throw new Error(`Racine introuvable : ${rootRel}`)

  const files: string[] = []
  const visited = new Set<string>()
  const stack: string[] = [rootAbs]

  while (stack.length > 0) {
    const file = stack.pop()!
    if (visited.has(file)) continue
    visited.add(file)

    const source = fs.readFileSync(file, 'utf8')
    if (isClientBoundary(source) && file !== rootAbs) continue
    files.push(file)

    for (const { spec, typeOnly } of extractImports(source)) {
      if (typeOnly) continue
      const resolved = resolveLocal(spec, file)
      if (resolved && !visited.has(resolved)) stack.push(resolved)
    }
  }
  return files
}

/**
 * Les deux options qui font sortir une route du rendu statique, vérifiées dans le
 * source installé (`node_modules/next/dist/server/lib/patch-fetch.js`, next 15.5.18) :
 * `revalidate: 0` déclenche `markCurrentScopeAsDynamic` l.510, `cache: 'no-store'`
 * fait de même l.771. Une option ABSENTE, elle, ne fait rien basculer (`autoNoCache`,
 * l.375-386, garde le bailout l.480) : c'est pour ça que le correctif du Bloc 0 est
 * « pas d'option du tout » et non « une valeur plus douce ».
 */
const NO_CACHE_OPTIONS: { re: RegExp; label: string }[] = [
  { re: /\brevalidate\s*:\s*0\b/, label: 'revalidate: 0' },
  { re: /\bcache\s*:\s*['"]no-store['"]/, label: `cache: 'no-store'` },
]

type CachePin = { file: string; line: number; label: string; text: string }

function findNoCacheOptions(rootRel: string): CachePin[] {
  const pins: CachePin[] = []
  for (const abs of collectServerGraph(rootRel)) {
    const lines = stripComments(fs.readFileSync(abs, 'utf8')).split('\n')
    lines.forEach((line, i) => {
      for (const { re, label } of NO_CACHE_OPTIONS) {
        if (re.test(line)) pins.push({ file: rel(abs), line: i + 1, label, text: line.trim() })
      }
    })
  }
  return pins
}

function formatCachePins(rootRel: string, pins: CachePin[]): string {
  const lines = [
    '',
    `\`${rootRel}\` va rebasculer en DYNAMIQUE au runtime : ${pins.length} option(s) de cache`,
    "dans son graphe d'imports serveur empêchent Next de garder la route statique.",
    '',
    "Ce n'est PAS visible au build : la page se pré-rend normalement, puis chaque",
    'régénération ISR sort du cache. Précédent exact : issue Sentry JAVASCRIPT-NEXTJS-1P,',
    '355 événements en 22 h sur `/spots/[slug]`, découverte par hasard trois semaines',
    "après le sprint 84 qui l'avait introduite.",
    '',
  ]
  for (const p of pins) {
    lines.push(`  ${p.file}:${p.line}  ⛔ ${p.label}`)
    lines.push(`    ${p.text}`)
    lines.push('')
  }
  lines.push(
    'Correctif : RETIRER l’option, sans la remplacer. Le défaut Next 15 ne met rien en',
    'cache et ne fait pas basculer la route. Attention au piège : une valeur plus douce',
    '(`revalidate: 900`) ne fait pas basculer non plus, mais ABAISSE en silence le',
    'revalidate de la route entière à cette valeur.',
    '',
    'Si le module a réellement besoin de ne jamais être mis en cache, il n’a rien à',
    'faire dans le graphe serveur d’une page ISR : appelle-le depuis une server action',
    'ou une route handler (modèle : lib/conditions/openmeteo.ts).',
    '',
  )
  return lines.join('\n')
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

describe('verrou : aucune option de cache ne sort les pages spots du rendu statique', () => {
  for (const rootRel of ROOTS) {
    it(`${rootRel} n'a ni revalidate: 0 ni no-store dans son graphe serveur`, () => {
      const pins = findNoCacheOptions(rootRel)
      expect(pins, formatCachePins(rootRel, pins)).toEqual([])
    })
  }
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

  // Un détecteur qu'aucun cas témoin ne fait mordre est un détecteur qui dort. Les
  // deux tests ci-dessous sont les gardes du garde.
  it('le détecteur d’options de cache mord sur lib/conditions/openmeteo.ts', () => {
    // Ce fichier porte DEUX `revalidate: 0` parfaitement légitimes : il n'est appelé
    // que depuis une server action, jamais depuis une page ISR. Il ne déclenche donc
    // aucune violation réelle (il n'est dans le graphe d'aucune des deux racines),
    // et c'est exactement ce qui en fait un bon témoin.
    const pins = findNoCacheOptions('lib/conditions/openmeteo.ts')
    expect(pins.map((p) => p.label)).toContain('revalidate: 0')
    expect(pins.length).toBeGreaterThanOrEqual(2)
  })

  it('le détecteur ignore un `revalidate: 0` qui n’est QUE dans un commentaire', () => {
    // `lib/conditions/spot-forecast.ts` explique en commentaire pourquoi l'option a
    // été retirée, et cite donc le motif plusieurs fois. Si `stripComments` lâchait,
    // ce verrou deviendrait ininterprétable : il hurlerait sur sa propre explication.
    const source = fs.readFileSync(path.join(ROOT, 'lib/conditions/spot-forecast.ts'), 'utf8')
    expect(source, 'le commentaire témoin a disparu, ce test ne prouve plus rien').toMatch(
      /\/\/.*revalidate: 0/,
    )
    expect(findNoCacheOptions('lib/conditions/spot-forecast.ts')).toEqual([])
  })
})
