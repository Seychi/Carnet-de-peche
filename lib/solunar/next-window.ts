import type { DailyForecast, FishingWindow } from './types'
import { SOLUNAR_CONFIG } from './config'

export function getNextBestWindow(daily: DailyForecast[]): FishingWindow | null {
  const now = Date.now()

  const upcoming = daily
    .flatMap(d => d.windows)
    .filter(w => new Date(w.endTimeISO).getTime() > now)
    .sort((a, b) => new Date(a.startTimeISO).getTime() - new Date(b.startTimeISO).getTime())

  if (upcoming.length === 0) return null

  const goodThreshold = SOLUNAR_CONFIG.QUALITY_THRESHOLDS.bonne

  return upcoming.find(w => w.score >= goodThreshold) ?? upcoming[0]
}

// Fenêtre dont l'intervalle [start, end] contient l'instant présent, sinon null.
export function findCurrentWindow(daily: DailyForecast[]): FishingWindow | null {
  const now = Date.now()

  for (const day of daily) {
    for (const w of day.windows) {
      const start = new Date(w.startTimeISO).getTime()
      const end = new Date(w.endTimeISO).getTime()
      if (now >= start && now <= end) return w
    }
  }

  return null
}
