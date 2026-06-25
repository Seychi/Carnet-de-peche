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
// Le client est un client anon SANS cookies (comme home-stats) → counts/activité
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
  /** Spots publics réels (copy « 157 spots curés »). */
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

async function _getHeroSnapshot(): Promise<HeroSnapshot> {
  const sb = anonClient()
  const nowHour = parisHourNow()
  let heroSpot:
    | { name: string; slug: string; department: string; lat: number; lng: number }
    | null = null
  let score: number | null = null
  let quality: string | null = null
  let nextWindow: HeroSnapshot['nextWindow'] = null
  let mapSpots: HeroSnapshot['mapSpots'] = []

  if (sb) {
    // Spots Finistère : anon → gatés 3/dépt, position = centroïde geom_public.
    const { data: spots } = await sb.rpc('get_spots_for_map', { dept_filter: HERO_DEPT })
    if (spots && spots.length > 0) {
      const ids = spots.map((s) => s.id)
      const { data: scores } = await sb
        .from('spot_scores')
        .select('spot_id, day_score, next_window_start, next_window_quality')
        .in('spot_id', ids)
        .gt('valid_until', new Date().toISOString())
      const scoreById = new Map((scores ?? []).map((r) => [r.spot_id, r as ScoreRow]))
      const chosen = rankByDayScore(spots, (id) => scoreById.get(id)?.day_score ?? null)[0]
      heroSpot = {
        name: chosen.name,
        slug: chosen.slug,
        department: (chosen.department ?? '').trim(),
        lat: chosen.lat,
        lng: chosen.lng,
      }
      const sc = scoreById.get(chosen.id)
      // day_score = meilleur moment du jour ; la qualité en est DÉRIVÉE (mêmes seuils
      // que le cron) car spot_scores ne stocke pas de colonne `day_quality`.
      score = sc?.day_score ?? null
      quality = score != null ? qualityFromScore(score) : null
      nextWindow =
        sc?.next_window_start && sc.next_window_quality
          ? { startISO: sc.next_window_start, quality: sc.next_window_quality }
          : null
      // Spots de la façade pour la carte de fond (position = centroïde geom_public).
      mapSpots = spots.slice(0, 12).map((s) => {
        const ds = scoreById.get(s.id)?.day_score ?? null
        return {
          id: s.id,
          name: s.name,
          lat: s.lat,
          lng: s.lng,
          quality: ds != null ? qualityFromScore(ds) : null,
        }
      })
    }
  }

  const position = heroSpot ? { lat: heroSpot.lat, lng: heroSpot.lng } : POINTE_DU_RAZ

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

/** Mémoïsé par requête (React cache) — pas `unstable_cache` (fetchSpotConditions lit des cookies). */
export const getHeroSnapshot = cache(_getHeroSnapshot)

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
