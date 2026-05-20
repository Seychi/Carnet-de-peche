import type { CatchSample, CatchPattern } from './types'
import { bucketizeWind, bucketizeHour, bucketizeSeason } from './catch-analysis'
import { PERSONAL_SCORING_CONFIG as CFG } from './personal-config'

// ─── computeCatchPatterns ───────────────────────────────────────────────────
// Approche purement DESCRIPTIVE : pour chaque facteur, on identifie la condition
// la plus fréquente parmi tes prises (le bucket dominant). Aucune notion de
// "tu pêches mieux" — ça nécessiterait de logger les sorties bredouilles, ce que
// le carnet ne fait pas. On dit seulement : voilà où/quand tombent tes prises.

function dominant<T extends string>(values: T[]): { value: T; count: number } | null {
  if (values.length === 0) return null
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)

  let best: T | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best === null ? null : { value: best, count: bestCount }
}

export function computeCatchPatterns(samples: CatchSample[]): CatchPattern[] {
  // ── Vent : uniquement les prises dont le vent est renseigné ────────────────
  const windSamples = samples.filter((s) => s.windSpeedKmh !== null)
  const windDom = dominant(windSamples.map((s) => bucketizeWind(s.windSpeedKmh)))

  // ── Marée : uniquement les prises dont la marée est connue ─────────────────
  const tideSamples = samples.filter(
    (s): s is CatchSample & { tideState: 'rising' | 'falling' | 'slack' } =>
      s.tideState === 'rising' || s.tideState === 'falling' || s.tideState === 'slack',
  )
  const tideDom = dominant(tideSamples.map((s) => s.tideState))

  // ── Heure & saison : toujours dérivables de la date ────────────────────────
  const hourDom = dominant(samples.map((s) => bucketizeHour(s.hourLocal)))
  const seasonDom = dominant(samples.map((s) => bucketizeSeason(s.monthLocal)))

  return [
    {
      factor: 'wind',
      dominantLabel: windDom ? CFG.WIND_BUCKETS[windDom.value].label : null,
      count: windDom?.count ?? 0,
      total: windSamples.length,
      hasData: windSamples.length > 0,
    },
    {
      factor: 'tide',
      dominantLabel: tideDom ? CFG.TIDE_LABELS[tideDom.value] : null,
      count: tideDom?.count ?? 0,
      total: tideSamples.length,
      hasData: tideSamples.length > 0,
    },
    {
      factor: 'hour',
      dominantLabel: hourDom ? CFG.HOUR_LABELS[hourDom.value] : null,
      count: hourDom?.count ?? 0,
      total: samples.length,
      hasData: samples.length > 0,
    },
    {
      factor: 'season',
      dominantLabel: seasonDom ? CFG.SEASON_LABELS[seasonDom.value] : null,
      count: seasonDom?.count ?? 0,
      total: samples.length,
      hasData: samples.length > 0,
    },
  ]
}
