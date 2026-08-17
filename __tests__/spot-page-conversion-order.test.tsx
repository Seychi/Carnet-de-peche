import { describe, it, expect, vi } from 'vitest'

// Même symptôme qu'en `spot-page-no-coordinate-leak` : le premier `import()` à froid
// de la fiche spot tire un très gros graphe de modules et dépasse les 5 s par défaut.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 })
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// `tsconfig.json` est en `jsx: preserve` : esbuild compile le JSX vers
// `React.createElement` sans importer React. Shim de test uniquement.
;(globalThis as unknown as { React: typeof React }).React = React

/**
 * ★ SPRINT 85, Bloc 2 — ORDRE DU DOCUMENT DE LA FICHE DE SPOT.
 *
 * Ce que ce test protège, et pourquoi il regarde le HTML plutôt que le code :
 *
 * 1. **Un seul mur d'inscription dans le corps de la page.** La fiche en empilait
 *    quatre (`spot_score`, `spot_tides`, `spot_page` mobile, `spot_catches`), qui
 *    disaient la même chose avec le même bouton vert.
 *
 * 2. **Le tunnel SANS COMPTE passe avant le mur.** `/carnet/nouvelle` est le seul
 *    chemin de la fiche qui n'exige aucun compte, et il n'apparaissait qu'en bas de
 *    page : on demandait trois fois un compte avant de proposer la chose qui n'en
 *    demande pas. L'ordre est donc le sujet, pas la présence.
 *
 * 3. ★ **On prouve le CHEMIN, pas la destination** (leçon du sprint 78). Le critère
 *    « la route /carnet/nouvelle répond 200 » validait une porte sans poignée : le
 *    lien doit exister, cliquable, DANS LE HTML SERVI. Comme la page est pré-rendue
 *    depuis le sprint 84, ce HTML est exactement celui de Googlebot et des 82 % de
 *    visiteurs mobiles venus du moteur.
 *
 * Le rendu est ANONYME par construction : `SpotViewerProvider` part de
 * `ANONYMOUS_VIEWER`, comme le vrai rendu serveur qui ne lit aucun cookie.
 */

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SPOT = {
  id: 'spot-uuid-1',
  name: 'Pointe du Grand Minou',
  slug: 'pointe-du-grand-minou',
  department: '29 ',
  region: 'Bretagne',
  lng: -4.6021234,
  lat: 48.3563451,
  is_precise: false,
  techniques: ['leurres'],
  species: ['bar'],
  structure: 'pointe',
  difficulty: 3,
  description: 'Une pointe rocheuse exposée.',
  access_notes: 'Parking à 300 m.',
  hazards: ['vagues'],
  visibility: 'public',
  verified: true,
  verified_at: '2026-05-01T10:00:00Z',
  verification_level: 'equipe',
  source: 'curated',
  created_at: '2026-01-01T10:00:00Z',
}

const CATCHES = [
  { id: 'c1', species: 'bar', size_cm: 62, weight_g: 2400, caught_at: '2026-08-10T08:00:00Z', username: 'jean29', display_name: 'Jean' },
  { id: 'c2', species: 'bar', size_cm: 48, weight_g: 1200, caught_at: '2026-08-09T08:00:00Z', username: 'marie56', display_name: 'Marie' },
  { id: 'c3', species: 'lieu_jaune', size_cm: 40, weight_g: 800, caught_at: '2026-08-08T08:00:00Z', username: 'paul22', display_name: 'Paul' },
]

// ─── Doublure Supabase (client anonyme, sans cookies) ────────────────────────

type Result = { data?: unknown; error?: null; count?: number }

function builder(result: Result) {
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'neq', 'order', 'limit', 'contains', 'gt', 'in', 'is']) {
    chain[m] = () => chain
  }
  chain.maybeSingle = () => Promise.resolve(result)
  chain.single = () => Promise.resolve(result)
  chain.then = (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

vi.mock('@/lib/supabase/anon', () => ({
  createAnonClient: () => ({
    rpc: (name: string) => {
      if (name === 'get_spot_by_slug') return Promise.resolve({ data: [SPOT], error: null })
      if (name === 'nearby_spots') return Promise.resolve({ data: [], error: null })
      if (name === 'get_spot_confirmation_count') return Promise.resolve({ data: 4, error: null })
      if (name === 'get_spot_activity') return Promise.resolve({ data: [], error: null })
      return Promise.resolve({ data: null, error: null })
    },
    from: (table: string) =>
      table === 'catches_for_viewer'
        ? builder({ data: CATCHES, error: null, count: CATCHES.length })
        : builder({ data: [], error: null, count: 0 }),
  }),
}))

// ─── Doublures ───────────────────────────────────────────────────────────────

function echo(name: string) {
  const Echo = (props: Record<string, unknown>) => {
    const safe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(props ?? {})) {
      if (typeof v === 'function') continue
      if (v && typeof v === 'object' && '$$typeof' in (v as object)) continue
      safe[k] = v
    }
    return createElement('div', { 'data-mock': name, 'data-props': JSON.stringify(safe) })
  }
  Echo.displayName = `Echo(${name})`
  return Echo
}

// ⚠️ `className` est conservé : c'est lui qui porte la cible tactile (`min-h-11`).
vi.mock('next/link', () => ({
  default: ({ href, className, children }: { href: string; className?: string; children?: unknown }) =>
    createElement('a', { href, className }, children as never),
}))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound')
  },
  usePathname: () => '/spots/pointe-du-grand-minou',
}))

// PostHog n'a rien à faire dans un rendu serveur. La doublure évite d'importer le
// SDK et rend l'absence d'émission côté serveur explicite.
vi.mock('@/lib/analytics', () => ({
  analytics: new Proxy({}, { get: () => () => {} }),
}))

vi.mock('@/components/spots/SpotMiniMap', () => ({ default: echo('SpotMiniMap') }))
vi.mock('@/components/spots/SpotTodayBand', () => ({ default: echo('SpotTodayBand') }))
vi.mock('@/components/spots/SpotConditionsSection', () => ({ default: echo('SpotConditionsSection') }))
vi.mock('@/components/spots/SpotBestMomentsSection', () => ({ SpotBestMomentsSection: echo('SpotBestMomentsSection') }))
vi.mock('@/components/spots/SpotActivitySection', () => ({ SpotActivitySection: echo('SpotActivitySection') }))
vi.mock('@/components/spots/TideCalibrationNote', () => ({ TideCalibrationNote: echo('TideCalibrationNote') }))
vi.mock('@/components/regulation/SpotRegulationCard', () => ({ SpotRegulationCard: echo('SpotRegulationCard') }))
vi.mock('@/components/spots/NearbySpotsSection', () => ({ NearbySpotsSection: echo('NearbySpotsSection') }))
vi.mock('@/components/spots/SpotUpLinks', () => ({ SpotUpLinks: echo('SpotUpLinks') }))
vi.mock('@/components/spots/FavoriteSpotButton', () => ({ FavoriteSpotButton: echo('FavoriteSpotButton') }))
vi.mock('@/components/spots/ReportSpotDialog', () => ({
  SpotReportButton: echo('SpotReportButton'),
  SpotConfirmButton: echo('SpotConfirmButton'),
}))
vi.mock('@/components/scoring/PersonalTendencies', () => ({ PersonalTendencies: echo('PersonalTendencies') }))
vi.mock('@/components/conditions/TideStrengthBand', () => ({
  default: echo('TideStrengthBand'),
  buildMarnageDays: () => [],
}))

// ⚠️ `SignupWall` et `SpotSignupCta` sont rendus POUR DE VRAI : c'est leur copie et
// leur place dans le document que ce test mesure.

vi.mock('@/lib/conditions/spot-forecast', () => ({
  fetchSpotConditions: async () => ({
    date: '2026-08-17',
    fetched_at: '2026-08-17T06:00:00Z',
    tide: { points: [{ hour: 6, height_m: 4.2 }], extrema: [{ hour: 6, type: 'high' }] },
    weather: { code: 1, wind_speed_kmh: 12, wind_direction_deg: 220, sunrise: null, sunset: null },
    waves: { height_m: 0.8 },
    swell: {},
  }),
  fetchSpotForecastWeek: async () => [],
}))
vi.mock('@/lib/conditions/bathymetry', () => ({
  fetchSpotDepth: async () => null,
  fetchSeabedSubstrate: async () => null,
}))
vi.mock('@/lib/conditions/tide-calibration', () => ({
  isLowTidalRangeDepartment: () => false,
  getTideAccuracyChip: async () => null,
  monthsAgo: () => 3,
}))
vi.mock('@/lib/spots/week', () => ({
  buildSpotWeek: async () => ({
    forecastWeek: [],
    weekly: [{ date: '2026-08-17', dayScore: 71, dayQuality: 'high' }],
    weatherCodes: { '2026-08-17': 1 },
    tidesByDate: { '2026-08-17': { high: '06h12', low: '12h30' } },
    marnageDays: [],
    tideOffsetHours: 0,
  }),
  calibratedExtremumLabel: () => '06h12',
  pickDates: <T,>(src: Record<string, T>) => src,
}))
vi.mock('@/lib/guides/loader', () => ({ getAllGuides: async () => [] }))

// ─── Rendu ───────────────────────────────────────────────────────────────────

let cached: string | null = null

async function html(): Promise<string> {
  if (cached) return cached
  const mod = await import('@/app/(marketing)/spots/[slug]/page')
  const element = await mod.default({ params: Promise.resolve({ slug: SPOT.slug }) })
  cached = renderToStaticMarkup(element as React.ReactElement)
  return cached
}

/** Décalages de toutes les occurrences d'un motif dans le HTML servi. */
function offsets(source: string, needle: string): number[] {
  const out: number[] = []
  let i = source.indexOf(needle)
  while (i !== -1) {
    out.push(i)
    i = source.indexOf(needle, i + 1)
  }
  return out
}

/** Un mur = un CTA « Créer mon carnet ». C'est le marqueur le plus stable. */
const WALL_CTA = 'Créer mon carnet'
const TUNNEL_HREF = `/carnet/nouvelle?spot_id=${SPOT.id}`

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('fiche spot : un seul mur, et le tunnel sans compte avant lui', () => {
  it('ne sert que DEUX murs d’inscription : le milieu de page et la fin de lecture', async () => {
    const source = await html()
    const walls = offsets(source, WALL_CTA)
    expect(
      walls.length,
      `Attendu 2 murs (corps + fin de lecture), trouvé ${walls.length} aux offsets ${walls.join(', ')}.`,
    ).toBe(2)
  })

  /**
   * ⚠️ Pourquoi on n'assène PAS « le premier mur est avant la moitié des octets » :
   * dans ce rendu, les grosses sections (conditions, meilleurs moments, activité,
   * spots proches, liens remontants) sont des doublures d'une centaine d'octets
   * alors qu'elles pèsent plusieurs kilo-octets en production. Le milieu du
   * document en caractères n'y veut donc rien dire, dans un sens comme dans
   * l'autre. Ce qui est vrai quelles que soient les doublures, c'est la place du
   * mur dans la STRUCTURE : un seul dans la colonne de lecture, à la coupure, et
   * un seul dans la colonne latérale, en fin de document.
   */
  it('place le mur unique dans la colonne de lecture et le second dans l’aside', async () => {
    const source = await html()
    const asideAt = source.indexOf('<aside')
    const walls = offsets(source, WALL_CTA)
    expect(asideAt, 'la colonne latérale devrait exister').toBeGreaterThan(-1)

    const inReadingColumn = walls.filter((o) => o < asideAt)
    const inSidebar = walls.filter((o) => o > asideAt)
    expect(
      inReadingColumn.length,
      `Murs dans la colonne de lecture (avant l'aside à ${asideAt}) : ${inReadingColumn.join(', ')}.`,
    ).toBe(1)
    expect(inSidebar.length, 'un seul mur de fin de lecture, dans la colonne latérale').toBe(1)
  })

  it('pose le mur unique À LA COUPURE : après les conditions, avant l’activité', async () => {
    const source = await html()
    const conditionsAt = source.indexOf('data-mock="SpotConditionsSection"')
    const activityAt = source.indexOf('data-mock="SpotActivitySection"')
    const wallAt = offsets(source, WALL_CTA)[0]
    expect(conditionsAt).toBeGreaterThan(-1)
    expect(activityAt).toBeGreaterThan(-1)
    // Le désir naît sur les 7 prochains jours : c'est là que le mur a un sens, et
    // nulle part au-dessus (le mur `spot_score` du sprint 77 arrivait AVANT que le
    // visiteur ait reçu quoi que ce soit).
    expect(wallAt).toBeGreaterThan(conditionsAt)
    expect(wallAt).toBeLessThan(activityAt)
  })

  it('porte un lien CLIQUABLE vers /carnet/nouvelle dans le HTML servi', async () => {
    const source = await html()
    // Le CHEMIN, pas la destination : un vrai <a href>, pas un bouton monté après
    // hydratation ni une route qui répond 200 sans que rien n'y mène.
    expect(source).toContain(`<a href="${TUNNEL_HREF}"`)
  })

  it('place le tunnel sans compte AVANT le premier mur', async () => {
    const source = await html()
    const firstTunnel = offsets(source, `<a href="${TUNNEL_HREF}"`)[0]
    const firstWall = offsets(source, WALL_CTA)[0]
    expect(firstTunnel, 'aucun lien /carnet/nouvelle dans le HTML').toBeGreaterThan(-1)
    expect(
      firstTunnel,
      `Le tunnel sans compte est à ${firstTunnel}, le premier mur à ${firstWall} : ` +
        'on redemande un compte avant de proposer ce qui n’en demande pas.',
    ).toBeLessThan(firstWall)
  })

  it('donne au tunnel une cible tactile de 44 px et une copie honnête', async () => {
    const source = await html()
    expect(source).toContain('Note ta prise ici, pas besoin de compte')
    // Ce que dit CatchForm au visiteur anonyme, mot pour mot : le CTA ne promet
    // que ce que la page suivante livre.
    expect(source).toContain('on ne te demandera le compte qu’à la fin')
    const link = source.slice(source.indexOf(`<a href="${TUNNEL_HREF}"`))
    expect(link.slice(0, link.indexOf('>'))).toContain('min-h-11')
  })
})

describe('fiche spot : le mur unique garde la copie gagnante ET son identifiant', () => {
  it('sert la copie « Suis {nom}, c’est gratuit » et la note sans carte bancaire', async () => {
    const source = await html()
    expect(source).toContain(`Suis ${SPOT.name}, c&#x27;est gratuit`)
    expect(source).toContain('Sans carte bancaire, en 30 secondes.')
    expect(source).toContain('Les 7 prochains jours de marées et de météo ici')
  })

  it('n’affiche plus AUCUNE copie de coupure nue', async () => {
    const source = await html()
    // Les trois titres compacts des murs empilés : ils n'ont plus de mur à habiller.
    expect(source).not.toContain('Vois les 7 prochains jours')
    expect(source).not.toContain('Trouve le bon créneau')
    expect(source).not.toContain('Vois tout ce qui se prend')
  })

  it('garde les identifiants de surface déclarés (aucun renommage)', async () => {
    const { SIGNUP_WALL_SURFACES } = await import('@/lib/gating/wall')
    for (const surface of ['spot_page', 'spot_tides', 'spot_score', 'spot_catches'] as const) {
      expect(
        SIGNUP_WALL_SURFACES,
        `${surface} a disparu de SIGNUP_WALL_SURFACES : renommer ou supprimer une surface ` +
          "casse l'historique du funnel (cf lib/gating/wall.ts).",
      ).toContain(surface)
    }
  })
})

describe('Défaut 3 : plus aucune surface ne peut cliquer sans déclarer d’impression', () => {
  it('SignupWall n’expose plus de prop `track`', async () => {
    const { readFileSync } = await import('node:fs')
    const path = await import('node:path')
    const root = path.resolve(__dirname, '..')
    const src = readFileSync(path.join(root, 'components/map/SignupBanner.tsx'), 'utf8')
    // La prop coupait l'impression SANS couper le clic : c'est très exactement ce
    // qui a donné `spot_tides` 7 clics / 0 impression sur 90 jours.
    expect(src).not.toMatch(/\btrack\s*[?:=]/)
    expect(src).toContain('useSignupWallImpression')
  })

  it('aucune page ne repasse `track` à un mur', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs')
    const path = await import('node:path')
    const root = path.resolve(__dirname, '..')
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = path.join(dir, entry)
        if (statSync(full).isDirectory()) return entry === '__tests__' ? [] : walk(full)
        return /\.tsx$/.test(entry) ? [full] : []
      })
    // Hors commentaires : le POURQUOI de la suppression est documenté dans les
    // fichiers concernés, et il cite forcément la prop supprimée.
    const stripComments = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    const offenders = [...walk(path.join(root, 'app')), ...walk(path.join(root, 'components'))].filter(
      (file) => /track=\{/.test(stripComments(readFileSync(file, 'utf8'))),
    )
    expect(offenders.map((f) => path.relative(root, f))).toEqual([])
  })

  it('le CTA collant mobile déclare son impression sur la surface qu’il clique', async () => {
    const { readFileSync } = await import('node:fs')
    const path = await import('node:path')
    const root = path.resolve(__dirname, '..')
    const src = readFileSync(path.join(root, 'components/spots/SpotSignupCta.tsx'), 'utf8')
    // Il émet `signupWallClicked({ surface: 'spot_page' })` : sans impression sur la
    // MÊME surface, `spot_page` repartirait avec des clics et zéro dénominateur.
    expect(src).toContain("useSignupWallImpression(ref, 'spot_page')")
  })
})
