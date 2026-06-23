import type {
  CatchSample,
  Tendency,
  TendencyFactor,
  PersonalTendencies,
  TendencyScope,
} from './types'
import { bucketizeWind, bucketizeHour, bucketizeSeason } from './buckets'
import {
  confidence,
  PERSONAL_CONFIG,
  WIND_LABELS,
  HOUR_LABELS,
  SEASON_LABELS,
  WEEKDAY_LABELS,
  TIDE_LABELS,
} from './config'

// ─── Bucket dominant ──────────────────────────────────────────────────────────
function dominant(values: string[]): { value: string; count: number } | null {
  if (values.length === 0) return null
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  let best: string | null = null
  let bestCount = 0
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value
      bestCount = count
    }
  }
  return best === null ? null : { value: best, count: bestCount }
}

// Une tendance = le libellé dominant + sa part parmi les prises AYANT la donnée.
// `labels` ne contient QUE les prises renseignées pour ce facteur.
function tendencyFromLabels(factor: TendencyFactor, labels: string[]): Tendency {
  const dom = dominant(labels)
  const total = labels.length
  return {
    factor,
    label: dom ? dom.value : null,
    count: dom?.count ?? 0,
    sampleCount: total,
    share: dom && total > 0 ? dom.count / total : 0,
    confidence: confidence(total),
    hasData: total > 0,
  }
}

// ─── Toutes les tendances d'un jeu de prises ──────────────────────────────────
export function computeTendencies(samples: CatchSample[]): Tendency[] {
  const hour = samples.map((s) => HOUR_LABELS[bucketizeHour(s.hourLocal)])
  const weekday = samples.map((s) => WEEKDAY_LABELS[s.weekdayLocal])
  const season = samples.map((s) => SEASON_LABELS[bucketizeSeason(s.monthLocal)])
  // Vent & marée : seulement les prises renseignées (absence ≠ valeur).
  const wind: string[] = []
  for (const s of samples) {
    const b = bucketizeWind(s.windSpeedKmh)
    if (b) wind.push(WIND_LABELS[b])
  }
  const tide: string[] = []
  for (const s of samples) {
    if (s.tideState) tide.push(TIDE_LABELS[s.tideState])
  }

  return [
    tendencyFromLabels('hour', hour),
    tendencyFromLabels('weekday', weekday),
    tendencyFromLabels('season', season),
    tendencyFromLabels('wind', wind),
    tendencyFromLabels('tide', tide),
  ]
}

// ─── API : tendances perso d'un périmètre (espèce et/ou spot) ─────────────────
export function computePersonalTendencies(
  samples: CatchSample[],
  scope: TendencyScope = {},
): PersonalTendencies {
  const scoped = samples.filter(
    (s) =>
      (scope.species == null || s.species === scope.species) &&
      (scope.spotId == null || s.spotId === scope.spotId),
  )
  const sampleCount = scoped.length

  const tendencies = computeTendencies(scoped)
    .filter((t) => t.hasData && t.sampleCount >= PERSONAL_CONFIG.MIN_PER_FACTOR)
    .sort((a, b) => b.share - a.share)

  return {
    species: scope.species ?? null,
    spotId: scope.spotId ?? null,
    sampleCount,
    confidence: confidence(sampleCount),
    tendencies,
    hasEnough: sampleCount >= PERSONAL_CONFIG.MIN_FOR_TENDENCIES,
    minToUnlock: Math.max(0, PERSONAL_CONFIG.MIN_FOR_TENDENCIES - sampleCount),
  }
}
