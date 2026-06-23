import SunCalc from 'suncalc'
import type { SpotConditions } from '@/lib/conditions/spot-forecast'
import type { DailyForecast, FishingWindow, SolunarEvent } from './types'
import { getSolunarEvents, getMoonPhaseLabel } from './astronomy'
import { scoreWindow, qualityFromScore } from './scoring'
import { formatLocalTime, formatLocalDate, getParisHour } from './format'
import { SOLUNAR_CONFIG } from './config'

// ─── Fenêtre temporelle autour d'un événement ────────────────────────────────

function buildWindow(
  centerEvent: SolunarEvent,
  conditions: SpotConditions
): FishingWindow | null {
  const centerMs = new Date(centerEvent.timeISO).getTime()
  const halfDuration = (SOLUNAR_CONFIG.WINDOW_DURATION_HOURS / 2) * 60 * 60 * 1000

  const startDate = new Date(centerMs - halfDuration)
  const endDate = new Date(centerMs + halfDuration)

  // Vérifier que la fenêtre est dans la plage horaire autorisée
  const startHour = getParisHour(startDate)
  const endHour = getParisHour(endDate)

  if (startHour < SOLUNAR_CONFIG.EARLIEST_HOUR || endHour > SOLUNAR_CONFIG.LATEST_HOUR) {
    // Si le centre lui-même est hors plage, skip
    const centerHour = getParisHour(new Date(centerEvent.timeISO))
    if (centerHour < SOLUNAR_CONFIG.EARLIEST_HOUR || centerHour > SOLUNAR_CONFIG.LATEST_HOUR) {
      return null
    }
    // Sinon on clipe la fenêtre aux bornes
  }

  const startISO = startDate.toISOString()
  const endISO = endDate.toISOString()

  // Vent À L'HEURE de la fenêtre (sprint 19 / WS-B) : on échantillonne le tableau
  // horaire à l'heure centrale locale, au lieu de réutiliser le scalaire de midi
  // pour toutes les fenêtres (cause du « 25/25 figé »). Fallback propre : scalaire
  // du jour, puis null, si le tableau est absent (cache antérieur) ou troué (DST/null).
  const centerHour = getParisHour(new Date(centerEvent.timeISO))
  const byHour = conditions.weather.wind_speed_by_hour
  const windAtCenter =
    byHour && centerHour >= 0 && centerHour < byHour.length && byHour[centerHour] != null
      ? byHour[centerHour]
      : conditions.weather.wind_speed_kmh

  const { score, factors } = scoreWindow(
    centerEvent,
    startISO,
    endISO,
    conditions.tide.points,
    conditions.tide.extrema,
    windAtCenter
  )

  return {
    startTimeISO: startISO,
    endTimeISO: endISO,
    startLocal: formatLocalTime(startDate),
    endLocal: formatLocalTime(endDate),
    centerEvent,
    score,
    quality: qualityFromScore(score),
    factors,
  }
}

// ─── Déduplication des fenêtres qui se chevauchent trop ──────────────────────

function overlapRatio(a: FishingWindow, b: FishingWindow): number {
  const aStart = new Date(a.startTimeISO).getTime()
  const aEnd = new Date(a.endTimeISO).getTime()
  const bStart = new Date(b.startTimeISO).getTime()
  const bEnd = new Date(b.endTimeISO).getTime()

  const overlapMs = Math.max(0, Math.min(aEnd, bEnd) - Math.max(aStart, bStart))
  const minDuration = Math.min(aEnd - aStart, bEnd - bStart)

  return minDuration > 0 ? overlapMs / minDuration : 0
}

function dedupWindows(windows: FishingWindow[]): FishingWindow[] {
  // Tri par score décroissant pour garder les meilleures en priorité
  const sorted = [...windows].sort((a, b) => b.score - a.score)
  const kept: FishingWindow[] = []

  for (const candidate of sorted) {
    const hasOverlap = kept.some(
      w => overlapRatio(candidate, w) > SOLUNAR_CONFIG.OVERLAP_DEDUP_THRESHOLD
    )
    if (!hasOverlap) {
      kept.push(candidate)
    }
  }

  // Re-tri chronologique pour l'affichage
  return kept
    .sort((a, b) => a.startTimeISO.localeCompare(b.startTimeISO))
    .slice(0, SOLUNAR_CONFIG.MAX_WINDOWS_PER_DAY)
}

// ─── Forecast journalier ─────────────────────────────────────────────────────

export async function computeDailyForecast(
  date: Date,
  lat: number,
  lng: number,
  conditions: SpotConditions
): Promise<DailyForecast> {
  const events = getSolunarEvents(date, lat, lng)
  const illum = SunCalc.getMoonIllumination(date)
  const sunTimes = SunCalc.getTimes(date, lat, lng)

  const rawWindows: FishingWindow[] = []

  for (const event of events) {
    const w = buildWindow(event, conditions)
    if (w) rawWindows.push(w)
  }

  const windows = dedupWindows(rawWindows)
  const dayScore = windows.length > 0 ? Math.max(...windows.map(w => w.score)) : 0

  const sunrise =
    sunTimes.sunrise && isFinite(sunTimes.sunrise.getTime())
      ? formatLocalTime(sunTimes.sunrise)
      : '--:--'
  const sunset =
    sunTimes.sunset && isFinite(sunTimes.sunset.getTime())
      ? formatLocalTime(sunTimes.sunset)
      : '--:--'

  return {
    date: formatLocalDate(date),
    windows,
    dayScore,
    dayQuality: qualityFromScore(dayScore),
    sunrise,
    sunset,
    moonPhaseLabel: getMoonPhaseLabel(illum.phase),
    moonIllumination: illum.fraction,
  }
}

// ─── Forecast 7 jours ────────────────────────────────────────────────────────

export async function computeWeeklyForecast(
  startDate: Date,
  lat: number,
  lng: number,
  conditions: SpotConditions[]
): Promise<DailyForecast[]> {
  const results: DailyForecast[] = []

  for (let i = 0; i < conditions.length; i++) {
    const day = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
    const daily = await computeDailyForecast(day, lat, lng, conditions[i])
    results.push(daily)
  }

  return results
}
