import { describe, it, expect, vi, beforeEach } from 'vitest'

// La fiche spot tire un très gros graphe de modules ; le PREMIER `import()` à froid
// dépasse largement les 5 s par défaut de Vitest (même symptôme connu sur
// `__tests__/security-headers.test.ts` depuis le sprint 83). Le temps est passé dans
// la transformation, pas dans le test : on relève la limite au lieu de faire semblant.
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 })
import * as React from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// `tsconfig.json` est en `jsx: preserve` : esbuild (transformeur de Vitest) compile
// le JSX vers `React.createElement` sans importer React. Hors bundler Next, il faut
// fournir le global. Shim de test uniquement, aucun effet sur le build.
;(globalThis as unknown as { React: typeof React }).React = React

/**
 * ★ SPRINT 84, Bloc 3 — TEST DE NON-FUITE DE LA FICHE SPOT.
 *
 * Ce que ce test protège : depuis ce sprint, `/spots/[slug]` est PRÉ-RENDUE et mise
 * en cache au CDN. Un HTML mis en cache qui contiendrait une coordonnée précise
 * serait une fuite de spot PERMANENTE ET PUBLIQUE — exactement ce que les migrations
 * 028, 029, 039 et 110 ont fermé côté base. La revue de code ne suffit pas pour ça :
 * il faut une assertion sur le HTML PRODUIT.
 *
 * La règle vérifiée, et elle est mécanique : le HTML servi ne contient AUCUN nombre à
 * plus de 3 décimales. 3 décimales ≈ 110 m, très en dessous du flou de 500-900 m déjà
 * appliqué par `geom_public` : on ne perd aucune information utile, et l'invariant
 * devient vérifiable au lieu d'être une intention. Sans cet arrondi, un lien
 * d'itinéraire sortait `destination=48.35634512,-4.60213` : impossible de distinguer
 * à l'œil, ou par un test, une coordonnée floutée d'une coordonnée exacte.
 *
 * ⚠️ Les composants CLIENT sont remplacés par des doublures qui RECRACHENT LEURS
 * PROPS dans le HTML. Ce n'est pas une facilité de test, c'est plus fidèle que le
 * vrai rendu : en production, les props d'un composant client sont sérialisées dans
 * le payload RSC du document, donc une coordonnée passée en prop est bel et bien
 * dans le HTML servi, « affichée » ou pas.
 *
 * Deux scénarios :
 *  1. la base se comporte normalement (`is_precise: false`) → on prouve que
 *     l'arrondi est appliqué partout ;
 *  2. la base renverrait quand même une position exacte → on prouve que le rendu
 *     serveur reste celui d'un anonyme, ceinture et bretelles.
 */

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Coordonnée « publique » telle que la renvoie la RPC : flottant plein. */
const BLURRED = { lat: 48.3563451, lng: -4.6021234 }
/** Coordonnée « exacte » du scénario 2 : elle ne doit JAMAIS sortir. */
const PRECISE = { lat: 48.3567891, lng: -4.6023456 }

function spotRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'spot-uuid-1',
    name: 'Pointe du Grand Minou',
    slug: 'pointe-du-grand-minou',
    department: '29 ',
    region: 'Bretagne',
    lng: BLURRED.lng,
    lat: BLURRED.lat,
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
    ...overrides,
  }
}

let currentSpot = spotRow()

/** Prise publique : porte un pseudo, qui ne doit pas non plus fuiter n'importe où. */
const CATCHES = [
  {
    id: 'c1', species: 'bar', size_cm: 62, weight_g: 2400,
    caught_at: '2026-08-10T08:00:00Z', username: 'jean29', display_name: 'Jean',
  },
  {
    id: 'c2', species: 'bar', size_cm: 48, weight_g: 1200,
    caught_at: '2026-08-09T08:00:00Z', username: 'marie56', display_name: 'Marie',
  },
  {
    id: 'c3', species: 'lieu_jaune', size_cm: 40, weight_g: 800,
    caught_at: '2026-08-08T08:00:00Z', username: 'paul22', display_name: 'Paul',
  },
]

// ─── Doublure Supabase (client anonyme, sans cookies) ────────────────────────

type Result = { data?: unknown; error?: null; count?: number }

function builder(result: Result) {
  const chain: Record<string, unknown> = {}
  const passthrough = [
    'select', 'eq', 'neq', 'order', 'limit', 'contains', 'gt', 'in', 'is',
  ]
  for (const m of passthrough) chain[m] = () => chain
  chain.maybeSingle = () => Promise.resolve(result)
  chain.single = () => Promise.resolve(result)
  chain.then = (resolve: (r: Result) => unknown) => Promise.resolve(result).then(resolve)
  return chain
}

vi.mock('@/lib/supabase/anon', () => ({
  createAnonClient: () => ({
    rpc: (name: string) => {
      if (name === 'get_spot_by_slug') return Promise.resolve({ data: [currentSpot], error: null })
      if (name === 'nearby_spots') return Promise.resolve({ data: [], error: null })
      if (name === 'get_spot_confirmation_count') return Promise.resolve({ data: 4, error: null })
      if (name === 'get_spot_activity') return Promise.resolve({ data: [], error: null })
      return Promise.resolve({ data: null, error: null })
    },
    from: (table: string) => {
      if (table === 'catches_for_viewer') {
        return builder({ data: CATCHES, error: null, count: CATCHES.length })
      }
      return builder({ data: [], error: null, count: 0 })
    },
  }),
}))

// ─── Doublures « échos de props » ────────────────────────────────────────────

/**
 * Sérialise les props en ignorant fonctions et éléments React (non sérialisables,
 * et ce n'est pas ce qu'on inspecte). Tout le reste part dans le HTML, comme le
 * payload RSC le ferait en production.
 */
function echo(name: string) {
  const Echo = (props: Record<string, unknown>) => {
    const safe: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(props ?? {})) {
      if (typeof v === 'function') continue
      if (v && typeof v === 'object' && '$$typeof' in (v as object)) continue
      safe[k] = v
    }
    return createElement('div', {
      'data-mock': name,
      'data-props': JSON.stringify(safe),
    })
  }
  Echo.displayName = `Echo(${name})`
  return Echo
}

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: unknown }) =>
    createElement('a', { href }, children as never),
}))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound')
  },
}))

vi.mock('@/components/spots/SpotMiniMap', () => ({ default: echo('SpotMiniMap') }))
vi.mock('@/components/spots/SpotTodayBand', () => ({ default: echo('SpotTodayBand') }))
vi.mock('@/components/spots/SpotConditionsSection', () => ({
  default: echo('SpotConditionsSection'),
}))
vi.mock('@/components/spots/SpotBestMomentsSection', () => ({
  SpotBestMomentsSection: echo('SpotBestMomentsSection'),
}))
vi.mock('@/components/spots/SpotActivitySection', () => ({
  SpotActivitySection: echo('SpotActivitySection'),
}))
vi.mock('@/components/spots/TideCalibrationNote', () => ({
  TideCalibrationNote: echo('TideCalibrationNote'),
}))
vi.mock('@/components/regulation/SpotRegulationCard', () => ({
  SpotRegulationCard: echo('SpotRegulationCard'),
}))
vi.mock('@/components/spots/NearbySpotsSection', () => ({
  NearbySpotsSection: echo('NearbySpotsSection'),
}))
vi.mock('@/components/spots/SpotUpLinks', () => ({ SpotUpLinks: echo('SpotUpLinks') }))
vi.mock('@/components/spots/SpotSignupCta', () => ({ SpotSignupCta: echo('SpotSignupCta') }))
vi.mock('@/components/map/SignupBanner', () => ({ SignupWall: echo('SignupWall') }))

// Les slots « delta connecté » sont rendus POUR DE VRAI : ce sont eux qui portent
// les coordonnées. Seules leurs feuilles lourdes (dialogs, actions serveur, sonner)
// sont doublées.
vi.mock('@/components/spots/FavoriteSpotButton', () => ({
  FavoriteSpotButton: echo('FavoriteSpotButton'),
}))
vi.mock('@/components/spots/ReportSpotDialog', () => ({
  SpotReportButton: echo('SpotReportButton'),
  SpotConfirmButton: echo('SpotConfirmButton'),
}))
vi.mock('@/components/scoring/PersonalTendencies', () => ({
  PersonalTendencies: echo('PersonalTendencies'),
}))
vi.mock('@/components/conditions/TideStrengthBand', () => ({
  default: echo('TideStrengthBand'),
  buildMarnageDays: () => [],
}))

// Données externes (Open-Meteo, EMODnet, MDX) : neutralisées, elles ne portent
// aucune coordonnée dans le rendu.
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

async function renderSpotPage(): Promise<string> {
  const mod = await import('@/app/(marketing)/spots/[slug]/page')
  const element = await mod.default({
    params: Promise.resolve({ slug: 'pointe-du-grand-minou' }),
  })
  return renderToStaticMarkup(element as React.ReactElement)
}

/**
 * Nombres à plus de 3 décimales présents dans le HTML.
 * Le motif vise la FORME d'une coordonnée décimale, signe optionnel compris.
 */
const OVER_PRECISE = /-?\d+\.\d{4,}/g

function overPreciseNumbers(html: string): string[] {
  return [...new Set(html.match(OVER_PRECISE) ?? [])]
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('fiche spot statique : aucune coordonnée précise dans le HTML mis en cache', () => {
  beforeEach(() => {
    currentSpot = spotRow()
  })

  it('n’émet aucun nombre à plus de 3 décimales (cas nominal, RPC floutée)', async () => {
    const html = await renderSpotPage()
    const offenders = overPreciseNumbers(html)
    expect(
      offenders,
      `Le HTML mis en cache contient des valeurs sur-précises : ${offenders.join(', ')}.\n` +
        'Toute coordonnée émise doit passer par roundCachedCoord() (lib/spots/viewer.ts).',
    ).toEqual([])
  })

  it('ne recopie jamais la coordonnée brute de la RPC', async () => {
    const html = await renderSpotPage()
    expect(html).not.toContain(String(BLURRED.lat))
    expect(html).not.toContain(String(BLURRED.lng))
    // La version arrondie, elle, doit bien être là (sinon le test ci-dessus
    // passerait pour la mauvaise raison : une page sans aucune coordonnée).
    expect(html).toContain('48.356')
    expect(html).toContain('-4.602')
  })

  it('rend TOUJOURS la branche non précise, même si la base renvoyait is_precise', async () => {
    // Ceinture et bretelles : si un jour le gating SQL était affaibli, le rendu
    // serveur ne doit pas amplifier la fuite en la mettant en cache.
    currentSpot = spotRow({ is_precise: true, lat: PRECISE.lat, lng: PRECISE.lng })
    const html = await renderSpotPage()

    expect(html).toContain('ZONE APPROCHÉE')
    expect(html).not.toContain('GPS précis disponible')
    expect(html).not.toContain(String(PRECISE.lat))
    expect(html).not.toContain(String(PRECISE.lng))
    expect(html).not.toContain(PRECISE.lat.toFixed(5))
    expect(html).not.toContain(PRECISE.lng.toFixed(5))
    expect(overPreciseNumbers(html)).toEqual([])
  })

  it('ne passe pas `isPrecise` à la mini-carte du HTML mis en cache', async () => {
    currentSpot = spotRow({ is_precise: true, lat: PRECISE.lat, lng: PRECISE.lng })
    const html = await renderSpotPage()
    const props = html.match(/data-mock="SpotMiniMap" data-props="([^"]*)"/)?.[1]
    expect(props, 'la doublure SpotMiniMap devrait avoir été rendue').toBeTruthy()
    const decoded = props!.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    expect(decoded).toContain('"isPrecise":false')
  })

  it('ne sert que le palier anonyme : 2 prises, aucun pseudo au-delà', async () => {
    const html = await renderSpotPage()
    // Les 2 premières prises sont dans le socle public (déjà le cas avant le sprint).
    expect(html).toContain('Jean')
    expect(html).toContain('Marie')
    // La 3e appartient au palier « compte gratuit » : elle ne doit pas être dans le
    // HTML mis en cache, ni masquée en CSS — absente, tout simplement.
    expect(html).not.toContain('Paul')
    expect(html).not.toContain('paul22')
  })

  it('ne contient aucune donnée de compte (pseudo du viewer, avatar, carnet)', async () => {
    const html = await renderSpotPage()
    // Le rendu serveur n'a AUCUN moyen de connaître le visiteur : les composants
    // de compte sont rendus dans leur variante anonyme, avec un lien de connexion.
    expect(html).toContain('/auth/login')
    // Les tendances perso ne sont jamais rendues côté serveur.
    expect(html).not.toContain('data-mock="PersonalTendencies"')
    // Ni l'encart d'abonnement, réservé aux inscrits (sprint 79, Bloc 5).
    expect(html).not.toContain('Voir les formules')
  })
})

describe('anti-CLS : les blocs qui disparaissent sont masqués avant la peinture', () => {
  beforeEach(() => {
    currentSpot = spotRow()
  })

  it('pose le style et le script de pré-peinture AVANT le premier mur', async () => {
    const html = await renderSpotPage()

    const styleAt = html.indexOf('data-anon-only]{display:none !important}')
    const scriptAt = html.indexOf('auth-token')
    const firstWallAt = html.indexOf('data-mock="SignupWall"')

    expect(styleAt, 'la règle de masquage doit être dans le HTML').toBeGreaterThan(-1)
    expect(scriptAt, "l'indice de session doit être dans le HTML").toBeGreaterThan(-1)
    expect(firstWallAt, 'au moins un mur doit être rendu en anonyme').toBeGreaterThan(-1)
    // L'ordre est TOUT le sujet : un style posé après le mur laisserait le mur être
    // peint, puis retiré, et tout le contenu du dessous remonterait.
    expect(styleAt).toBeLessThan(firstWallAt)
    expect(scriptAt).toBeLessThan(firstWallAt)
  })

  it('enveloppe chaque mur d’inscription dans un conteneur [data-anon-only]', async () => {
    const html = await renderSpotPage()
    const walls = html.match(/data-mock="SignupWall"/g) ?? []
    const wrappers = html.match(/data-anon-only=""/g) ?? []
    expect(walls.length).toBeGreaterThan(0)
    // Un conteneur par mur, plus ceux des CTA collants et de la ligne « N autres
    // prises ». Jamais moins de murs que de conteneurs : sinon un mur disparaîtrait
    // après hydratation en poussant le contenu.
    expect(wrappers.length).toBeGreaterThanOrEqual(walls.length)
  })
})
