import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { createClient as createAnonClient } from '@supabase/supabase-js'
import { fetchSpotConditions } from '@/lib/conditions/spot-forecast'
import {
  tideTrendAt,
  upcomingExtrema,
  dailyMarnage,
  type TideTrend,
  type UpcomingExtremum,
} from '@/lib/conditions/tide'
import { CARNET_SPECIES_OPTIONS } from '@/lib/seo/programmatic'
import { qualityFromScore } from '@/lib/solunar/scoring'
import { rankByDayScore, HOME_TIERS, type HomeTier } from './home-data-core'
import { toSpotMarker, limitSpotsPerDept, type SpotMarker } from '@/lib/map/utils'
import type { Database } from '@/lib/types'
import type { QualityLevel } from '@/lib/solunar/types'

export { HOME_TIERS, type HomeTier } from './home-data-core'

// ════════════════════════════════════════════════════════════════════════════
// Couche de données RÉELLES de la home publique (sprint 34, WS-2).
//
// 🔒 INVARIANT GPS : tout est lu pour un visiteur ANONYME, sans jamais exposer de
// coordonnée précise. Spots → RPC `get_spots_for_map` (lat/lng = centroïde de
// `geom_public`, jamais `geom` ; gating anon 3/dépt). Activité → `get_catch_heatmap`
// k-anon (K=3, counts only). Aucun accès direct à `spots`/`catches`.
//
// 🎣 HONNÊTETÉ MARÉE : le projet n'invente AUCUN coefficient SHOM (cf lib/conditions).
// La donnée réelle est le MARNAGE (amplitude PM-BM en mètres) + les PM/BM. Le hero
// affiche le marnage, pas un faux « coef ».
//
// Le client est un client anon SANS cookies → counts/activité
// passent en `unstable_cache` (ISR). Le hero réutilise `fetchSpotConditions` (cache
// weather_cache 1h) qui lit des cookies → mémoïsé par requête via React `cache()`,
// pas `unstable_cache` (la home est de toute façon déjà dynamique : Header + auth).
// ════════════════════════════════════════════════════════════════════════════

// Façade par défaut du hero (Finistère). Fallback marée = Pointe du Raz si aucun
// spot public n'est disponible (la marée ne dépend pas d'un spot précis).
const HERO_DEPT = '29'
const POINTE_DU_RAZ = { lat: 48.0386, lng: -4.7375 }

// BBox France métropolitaine + Corse (large) pour l'activité agrégée nationale.
const FRANCE_BBOX = { minLng: -5.5, minLat: 41.2, maxLng: 9.7, maxLat: 51.2 }

function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createAnonClient<Database>(url, key, { auth: { persistSession: false } })
}

// ── 1. Compteurs réels ────────────────────────────────────────────────────────

export type HomeCounts = {
  /** Spots publics réels (fallback copy statique = SPOTS_CURATED_FLOOR, cf lib/marketing/stats.ts). */
  spots: number | null
  /** Départements côtiers réellement couverts par des spots publics. */
  departments: number | null
  /** Espèces loguables (source unique du référentiel) = 26. */
  species: number
}

export const getHomeCounts = unstable_cache(
  async (): Promise<HomeCounts> => {
    const species = CARNET_SPECIES_OPTIONS.length
    const sb = anonClient()
    if (!sb) return { spots: null, departments: null, species }
    // `spots_for_viewer` : anon-safe (geom_precise = NULL pour anon), une ligne/spot.
    const { data, count, error } = await sb
      .from('spots_for_viewer')
      .select('department', { count: 'exact' })
    if (error || !data) return { spots: count ?? null, departments: null, species }
    const departments = new Set(
      data.map((r) => (r.department ?? '').trim()).filter(Boolean),
    ).size
    return { spots: count ?? data.length, departments, species }
  },
  ['home-counts-v1'],
  { revalidate: 3600 },
)

// ── 2. Activité communautaire AGRÉGÉE (k-anon, décision John : pas d'individuel) ─

export type HomeActivity = {
  /** Total des prises agrégées dans les cellules k-anon (K=3) sur 30 jours. */
  catchCount: number
  /** Nombre de cellules k-anon distinctes. */
  cellCount: number
}

export const getHomeActivity = unstable_cache(
  async (): Promise<HomeActivity> => {
    const sb = anonClient()
    if (!sb) return { catchCount: 0, cellCount: 0 }
    const { data, error } = await sb.rpc('get_catch_heatmap', {
      min_lng: FRANCE_BBOX.minLng,
      min_lat: FRANCE_BBOX.minLat,
      max_lng: FRANCE_BBOX.maxLng,
      max_lat: FRANCE_BBOX.maxLat,
      p_zoom: 7,
      // species_filter / technique_filter omis (optionnels, défaut SQL = null = sans filtre).
      p_days: 30,
    })
    if (error || !data) return { catchCount: 0, cellCount: 0 }
    const rows = data as { catch_count: number | null }[]
    return {
      catchCount: rows.reduce((s, r) => s + (r.catch_count ?? 0), 0),
      cellCount: rows.length,
    }
  },
  ['home-activity-v1'],
  { revalidate: 3600 },
)

// ── Spots de la carte explorable (section 02, WS-4) ─────────────────────────────
// Vue ANONYME identique au tier gratuit : tous les spots publics (centroïdes
// `geom_public` floutés, jamais `geom`), gatés 3/dépt comme sur /carte. Couleur des
// markers dérivée du `day_score` réel (spot_scores). Aucune fuite GPS.
export const getHomeMapSpots = unstable_cache(
  async (): Promise<SpotMarker[]> => {
    const sb = anonClient()
    if (!sb) return []
    const { data, error } = await sb.rpc('get_spots_for_map', {})
    if (error || !data) return []
    const spots = limitSpotsPerDept(data.map(toSpotMarker), 3)
    const ids = spots.map((s) => s.id)
    if (ids.length === 0) return spots
    const { data: scores } = await sb
      .from('spot_scores')
      .select('spot_id, day_score, valid_until')
      .gt('valid_until', new Date().toISOString())
      .in('spot_id', ids)
    const scoreById = new Map<string, number>()
    for (const r of (scores ?? []) as { spot_id: string; day_score: number | null }[]) {
      if (typeof r.day_score === 'number') scoreById.set(r.spot_id, r.day_score)
    }
    return spots.map((s) => {
      const ds = scoreById.get(s.id)
      return ds != null ? { ...s, dayScore: ds, dayQuality: qualityFromScore(ds) } : s
    })
  },
  ['home-map-spots-v1'],
  { revalidate: 3600 },
)

// ── 3. Hero : vraie marée du jour + score réel d'un spot par défaut ─────────────

type ScoreRow = {
  spot_id: string
  day_score: number | null
  next_window_start: string | null
  next_window_quality: string | null
}

export type HeroSnapshot = {
  spot: { name: string; slug: string; department: string } | null
  /** Position FLOUTÉE (centroïde geom_public) — jamais le GPS précis. */
  position: { lat: number; lng: number }
  /** Score générique réel 0-100 (meilleur moment du jour), ou null. */
  score: number | null
  quality: string | null
  /** Spots de la façade (anon, centroïdes floutés) — carte de fond du hero. */
  mapSpots: { id: string; name: string; lat: number; lng: number; quality: QualityLevel | null }[]
  /** Prochain créneau optimal réel (solunaire générique), ou null. */
  nextWindow: { startISO: string; quality: string } | null
  tide: {
    /** Points horaires réels (pour tracer la courbe). */
    points: { hour: number; height_m: number }[]
    /** PM/BM réels du jour. */
    extrema: { type: 'high' | 'low'; hour: number }[]
    nextHigh: UpcomingExtremum | null
    nextLow: UpcomingExtremum | null
    /** Marnage réel du jour (m) — la donnée honnête, PAS un coefficient. */
    marnageM: number | null
    trend: TideTrend | null
    currentHeightM: number | null
    /** Heure courante Europe/Paris (0-24) — curseur « maintenant ». */
    nowHour: number
  }
  weather: { windKmh: number | null; code: number | null; airTempC: number | null }
}

function parisHourNow(): number {
  // Les conditions sont indexées par heure LOCALE (Europe/Paris).
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  return h + m / 60
}

// Façades : la façade détermine le spot de l'INSTRUMENT (meilleur score) + le centre
// de la carte. La carte de fond, elle, montre TOUS les spots (cf getAllHeroSpots).
type HeroRegion = { depts: string[]; fallback: { lat: number; lng: number } }
const REGION_ATLANTIC: HeroRegion = { depts: [HERO_DEPT], fallback: POINTE_DU_RAZ }
// Fond MÉDITERRANÉE de la section Tarifs : centre FIXE sur Marseille (décision John).
const MED_CENTER = { lat: 43.3, lng: 5.37 }

type HeroSpotEnriched = {
  id: string
  name: string
  slug: string
  lat: number
  lng: number
  department: string
  dayScore: number | null
  nextWindowStart: string | null
  nextWindowQuality: string | null
}

// TOUS les spots publics (centroïdes geom_public FLOUTÉS) + leur day_score. Sert de
// carte de fond DÉCORATIVE pour les deux heros → vue bien remplie sur chaque façade.
// (Décoratif et flouté : pas le produit /carte, donc pas le gating 3/dépt.) React-cache
// → un seul fetch par requête, partagé Atlantique + Méditerranée.
const getAllHeroSpots = cache(async (): Promise<HeroSpotEnriched[]> => {
  const sb = anonClient()
  if (!sb) return []
  const { data: spots } = await sb.rpc('get_spots_for_map', {})
  if (!spots || spots.length === 0) return []
  const ids = spots.map((s) => s.id)
  const { data: scores } = await sb
    .from('spot_scores')
    .select('spot_id, day_score, next_window_start, next_window_quality')
    .in('spot_id', ids)
    .gt('valid_until', new Date().toISOString())
  const byId = new Map((scores ?? []).map((r) => [r.spot_id, r as ScoreRow]))
  return spots.map((s) => {
    const sc = byId.get(s.id)
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      lat: s.lat,
      lng: s.lng,
      department: (s.department ?? '').trim(),
      dayScore: sc?.day_score ?? null,
      nextWindowStart: sc?.next_window_start ?? null,
      nextWindowQuality: sc?.next_window_quality ?? null,
    }
  })
})

async function _getHeroSnapshot(region: HeroRegion): Promise<HeroSnapshot> {
  const nowHour = parisHourNow()
  const allSpots = await getAllHeroSpots()

  let heroSpot: HeroSpotEnriched | null = null
  let score: number | null = null
  let quality: string | null = null
  let nextWindow: HeroSnapshot['nextWindow'] = null
  let mapSpots: HeroSnapshot['mapSpots'] = []

  if (allSpots.length > 0) {
    // Carte de fond = TOUS les spots (floutés), colorés par score. La vue (zoom régional
    // centrée sur la façade) ne rend que ceux à l'écran → hero bien rempli, 0 fuite GPS.
    mapSpots = allSpots.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      quality: s.dayScore != null ? qualityFromScore(s.dayScore) : null,
    }))
    // Instrument = meilleur spot de la façade (fallback : meilleur toutes façades).
    const regional = allSpots.filter((s) => region.depts.includes(s.department))
    const pool = regional.length > 0 ? regional : allSpots
    const byId = new Map(pool.map((s) => [s.id, s]))
    heroSpot = rankByDayScore(pool, (id) => byId.get(id)?.dayScore ?? null)[0] ?? null
    if (heroSpot) {
      // day_score = meilleur moment du jour ; qualité DÉRIVÉE (mêmes seuils que le cron).
      score = heroSpot.dayScore
      quality = score != null ? qualityFromScore(score) : null
      nextWindow =
        heroSpot.nextWindowStart && heroSpot.nextWindowQuality
          ? { startISO: heroSpot.nextWindowStart, quality: heroSpot.nextWindowQuality }
          : null
    }
  }

  const position = heroSpot ? { lat: heroSpot.lat, lng: heroSpot.lng } : region.fallback

  let tide: HeroSnapshot['tide'] = {
    points: [],
    extrema: [],
    nextHigh: null,
    nextLow: null,
    marnageM: null,
    trend: null,
    currentHeightM: null,
    nowHour,
  }
  let weather: HeroSnapshot['weather'] = { windKmh: null, code: null, airTempC: null }

  try {
    const cond = await fetchSpotConditions(position.lat, position.lng)
    const { high, low } = upcomingExtrema(cond.tide.points, cond.tide.extrema, nowHour)
    tide = {
      points: cond.tide.points,
      extrema: cond.tide.extrema.map((e) => ({ type: e.type, hour: e.hour })),
      nextHigh: high,
      nextLow: low,
      marnageM: dailyMarnage(cond.tide.points),
      trend: cond.tide.points.length >= 2 ? tideTrendAt(cond.tide.points, nowHour) : null,
      currentHeightM: cond.tide.current_height_m,
      nowHour,
    }
    weather = {
      windKmh: cond.weather.wind_speed_kmh,
      code: cond.weather.code,
      airTempC: cond.weather.air_temp_c,
    }
  } catch {
    // Best-effort : la marée/météo restent nulles, le hero dégrade proprement.
  }

  return {
    spot: heroSpot
      ? { name: heroSpot.name, slug: heroSpot.slug, department: heroSpot.department }
      : null,
    position,
    score,
    quality,
    mapSpots,
    nextWindow,
    tide,
    weather,
  }
}

/** Hero façade ATLANTIQUE (par défaut). Mémoïsé par requête (React cache) — pas
 * `unstable_cache` (fetchSpotConditions lit des cookies). */
export const getHeroSnapshot = cache(() => _getHeroSnapshot(REGION_ATLANTIC))
/** Vue carte MÉDITERRANÉE — sert de FOND décoratif à la section Tarifs (§04). Centre =
 *  meilleur spot Med ; spots = TOUS (floutés). Léger : aucun fetch marée/météo (≠ hero). */
export type MedMapView = { center: { lat: number; lng: number }; mapSpots: HeroSnapshot['mapSpots'] }
export const getMedMapView = cache(async (): Promise<MedMapView> => {
  const allSpots = await getAllHeroSpots()
  const mapSpots: HeroSnapshot['mapSpots'] = allSpots.map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.lat,
    lng: s.lng,
    quality: s.dayScore != null ? qualityFromScore(s.dayScore) : null,
  }))
  return { center: MED_CENTER, mapSpots } // centré sur Marseille (fond §04)
})

// ── 4. Tarifs : HOME_TIERS / HomeTier réexportés depuis ./home-data-core ────────

// ── Agrégateur ─────────────────────────────────────────────────────────────────

export type HomeData = {
  counts: HomeCounts
  hero: HeroSnapshot
  activity: HomeActivity
  tiers: HomeTier[]
}

/** Récupère tout le réel de la home en parallèle (best-effort par brique). */
export async function getHomeData(): Promise<HomeData> {
  const [counts, hero, activity] = await Promise.all([
    getHomeCounts(),
    getHeroSnapshot(),
    getHomeActivity(),
  ])
  return { counts, hero, activity, tiers: HOME_TIERS }
}
