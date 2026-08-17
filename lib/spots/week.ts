import { fetchSpotForecastWeek, type SpotConditions } from '@/lib/conditions/spot-forecast'
import { refineExtremumHour, formatHourFraction } from '@/lib/conditions/tide'
import { getTideCalibration } from '@/lib/conditions/tide-calibration'
import { computeWeeklyForecast } from '@/lib/solunar/index'
import { buildMarnageDays } from '@/components/conditions/TideStrengthBand'
import type { DailyForecast } from '@/lib/solunar/types'

/**
 * Semaine d'un spot : prévisions 7 jours + solunar + tables d'affichage calées SHOM.
 *
 * Pourquoi ce module existe (sprint 84, Bloc 3) : la fiche `/spots/[slug]` est
 * désormais rendue en STATIQUE dans sa variante anonyme, qui ne sert que le jour même
 * (palier sprint 77, Bloc 2). Les 7 jours d'un visiteur CONNECTÉ sont donc servis
 * après hydratation par `/api/spots/[slug]/viewer`. Les deux chemins doivent produire
 * exactement les mêmes valeurs, sinon la frise afficherait un jour 1 différent du
 * score déjà lu par l'utilisateur : le calcul vit ici, à un seul endroit.
 *
 * 🔒 Aucune coordonnée n'entre ni ne sort d'ici au-delà de ce qui est déjà servi :
 * l'appelant passe la coordonnée qu'il a le droit de connaître. Les deux appelants
 * passent la MÊME (celle du client anonyme), ce qui garantit au passage un seul jeu
 * de clés dans le cache `unstable_cache` d'Open-Meteo par spot, connecté ou non.
 */
export type SpotWeek = {
  /** Prévisions brutes 7 jours (marée, météo, vagues) telles que renvoyées par Open-Meteo. */
  forecastWeek: SpotConditions[]
  /** Scores solunaires par jour. */
  weekly: DailyForecast[]
  /** Code météo WMO par date, pour les icônes du calendrier. */
  weatherCodes: Record<string, number>
  /** 1re PM / 1re BM du jour, formatées « HHhMM » et calées sur le port de référence. */
  tidesByDate: Record<string, { high?: string; low?: string }>
  /** Marnage réel par jour (bande « force des marées »). */
  marnageDays: { date: string; marnage: number | null }[]
  /** Offset de calibration en HEURES (0 si façade non auditée). */
  tideOffsetHours: number
}

const EMPTY: SpotWeek = {
  forecastWeek: [],
  weekly: [],
  weatherCodes: {},
  tidesByDate: {},
  marnageDays: [],
  tideOffsetHours: 0,
}

/**
 * Heure d'un extremum calée : raffinée sub-horaire + offset du port, formatée
 * « HHhMM » (même chaîne que les cartes texte). Bornée à l'axe 0-23.
 */
export function calibratedExtremumLabel(
  points: { hour: number; height_m: number }[],
  hour: number,
  tideOffsetHours: number,
): string {
  const h = Math.max(0, Math.min(23, refineExtremumHour(points, hour) + tideOffsetHours))
  return formatHourFraction(h)
}

export async function buildSpotWeek(
  lat: number,
  lng: number,
  department: string,
): Promise<SpotWeek> {
  const [forecastWeek, tideCal] = await Promise.all([
    fetchSpotForecastWeek(lat, lng).catch(() => [] as SpotConditions[]),
    getTideCalibration(department).catch(() => null),
  ])

  const tideOffsetHours = (tideCal?.offsetMinutes ?? 0) / 60
  if (forecastWeek.length === 0) return { ...EMPTY, tideOffsetHours }

  const weekly = await computeWeeklyForecast(new Date(), lat, lng, forecastWeek)

  const weatherCodes: Record<string, number> = {}
  const tidesByDate: Record<string, { high?: string; low?: string }> = {}
  for (const fc of forecastWeek) {
    if (fc.weather.code != null) weatherCodes[fc.date] = fc.weather.code
    const hi = fc.tide.extrema.find((e) => e.type === 'high')
    const lo = fc.tide.extrema.find((e) => e.type === 'low')
    if (hi || lo) {
      tidesByDate[fc.date] = {
        high: hi ? calibratedExtremumLabel(fc.tide.points, hi.hour, tideOffsetHours) : undefined,
        low: lo ? calibratedExtremumLabel(fc.tide.points, lo.hour, tideOffsetHours) : undefined,
      }
    }
  }

  return {
    forecastWeek,
    weekly,
    weatherCodes,
    tidesByDate,
    marnageDays: buildMarnageDays(forecastWeek),
    tideOffsetHours,
  }
}

/**
 * Réduit les tables annexes aux seules dates réellement rendues.
 * Sans ça, les jours 2 à 7 repartiraient dans le payload RSC par la bande : les
 * composants qui les consomment sont des composants CLIENT, donc tout ce qu'on leur
 * passe finit sérialisé dans le HTML, « masqué » ou pas.
 */
export function pickDates<T>(src: Record<string, T>, dates: Set<string>): Record<string, T> {
  return Object.fromEntries(Object.entries(src).filter(([date]) => dates.has(date)))
}
