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

/**
 * Les `count` prochaines fenêtres à venir, par ordre CHRONOLOGIQUE (la plus proche
 * d'abord). Sert le cockpit /home (« Maintenant » = la première, « Cette semaine » =
 * les suivantes) — un seul pipeline solunar pour les deux sections, zéro fenêtre
 * inventée : on ne renvoie que ce que le forecast contient.
 */
export function getUpcomingWindows(daily: DailyForecast[], count: number): FishingWindow[] {
  const now = Date.now()

  return daily
    .flatMap(d => d.windows)
    .filter(w => new Date(w.endTimeISO).getTime() > now)
    .sort((a, b) => new Date(a.startTimeISO).getTime() - new Date(b.startTimeISO).getTime())
    .slice(0, Math.max(0, count))
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
