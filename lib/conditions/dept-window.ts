import { unstable_cache } from 'next/cache'
import { fetchSpotForecastWeek } from './spot-forecast'
import { computeWeeklyForecast } from '@/lib/solunar'
import { getNextBestWindow, getUpcomingWindows } from '@/lib/solunar/next-window'
import { DEPARTMENT_SEA_COORDS } from '@/lib/geo/department-coords'
import type { FishingWindow } from '@/lib/solunar/types'

/**
 * Prochain créneau solunar du point de référence côtier d'un département.
 * Même pipeline que getSpotNextWindow (app/actions/solunar.ts), caché 1h.
 * Partagé entre le bandeau instruments et la card insight du carnet.
 * Tolérant : null si dépt inconnu ou données indisponibles.
 */
export async function getDeptNextWindow(dept: string): Promise<FishingWindow | null> {
  const coords = DEPARTMENT_SEA_COORDS[dept]
  if (!coords) return null
  const hourKey = Math.floor(Date.now() / 3_600_000).toString()
  try {
    return await unstable_cache(
      async () => {
        const week = await fetchSpotForecastWeek(coords.lat, coords.lng)
        if (!week.length) return null
        const weekly = await computeWeeklyForecast(new Date(), coords.lat, coords.lng, week)
        return getNextBestWindow(weekly)
      },
      ['dept-next-window', dept, hourKey],
      { revalidate: 3600 },
    )()
  } catch {
    return null
  }
}

/**
 * Les `count` prochaines fenêtres solunar du point côtier du département, par ordre
 * chronologique. Même pipeline (et même cache sous-jacent `spot-forecast-week`) que
 * getDeptNextWindow → AUCUN appel Open-Meteo supplémentaire. Sert le cockpit /home :
 * la 1re alimente « Maintenant », les suivantes « Cette semaine ». Tolérant : [] si
 * dépt inconnu ou données indisponibles.
 */
export async function getDeptUpcomingWindows(
  dept: string,
  count = 3,
): Promise<FishingWindow[]> {
  const coords = DEPARTMENT_SEA_COORDS[dept]
  if (!coords) return []
  const hourKey = Math.floor(Date.now() / 3_600_000).toString()
  try {
    return await unstable_cache(
      async () => {
        const week = await fetchSpotForecastWeek(coords.lat, coords.lng)
        if (!week.length) return []
        const weekly = await computeWeeklyForecast(new Date(), coords.lat, coords.lng, week)
        return getUpcomingWindows(weekly, count)
      },
      ['dept-upcoming-windows', dept, String(count), hourKey],
      { revalidate: 3600 },
    )()
  } catch {
    return []
  }
}
