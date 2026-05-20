import type { CatchSample, PersonalInsight, PersonalMultiplier, PersonalProfile } from './types'
import type { DbCatch } from './catch-analysis'
import {
  toCatchSamples,
  bucketizeWind,
  bucketizeHour,
  bucketizeSeason,
  computeMedianLength,
  computeConditionStats,
} from './catch-analysis'
import { PERSONAL_SCORING_CONFIG as CFG } from './personal-config'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function confidence(count: number): PersonalInsight['confidence'] {
  if (count < 5) return 'low'
  if (count <= 20) return 'medium'
  return 'high'
}

function formatPct(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function makeDescription(
  rate: number,
  count: number,
  hasLengthData: boolean
): string {
  const pct = formatPct(rate)
  const base = hasLengthData
    ? `${pct} de tes meilleures prises`
    : `${pct} de tes prises`
  return `${base} (sur ${count} session${count > 1 ? 's' : ''})`
}

// ─── computeInsights ──────────────────────────────────────────────────────────

export function computeInsights(samples: CatchSample[]): PersonalInsight[] {
  if (samples.length < CFG.MIN_CATCHES_FOR_INSIGHTS) return []

  const medianLength = computeMedianLength(samples)
  const hasLengthData = medianLength !== null
  const insights: PersonalInsight[] = []

  // ── Vent ──────────────────────────────────────────────────────────────────
  const windBuckets = Object.keys(CFG.WIND_BUCKETS) as (keyof typeof CFG.WIND_BUCKETS)[]
  for (const bucket of windBuckets) {
    const stats = computeConditionStats(
      samples,
      s => bucketizeWind(s.windSpeedKmh) === bucket,
      medianLength
    )
    if (stats.count < 2) continue
    insights.push({
      factor: 'wind',
      label: CFG.WIND_BUCKETS[bucket].label,
      description: makeDescription(stats.catchRate, stats.count, hasLengthData),
      catchRate: stats.catchRate,
      sampleCount: stats.count,
      isPositive: stats.catchRate >= CFG.CATCH_RATE_POSITIVE_THRESHOLD,
      confidence: confidence(stats.count),
    })
  }

  // ── Marée ─────────────────────────────────────────────────────────────────
  const tideBuckets: (keyof typeof CFG.TIDE_LABELS)[] = ['rising', 'falling', 'slack']
  for (const bucket of tideBuckets) {
    const stats = computeConditionStats(
      samples,
      s => s.tideState === bucket,
      medianLength
    )
    if (stats.count < 2) continue
    insights.push({
      factor: 'tide',
      label: CFG.TIDE_LABELS[bucket],
      description: makeDescription(stats.catchRate, stats.count, hasLengthData),
      catchRate: stats.catchRate,
      sampleCount: stats.count,
      isPositive: stats.catchRate >= CFG.CATCH_RATE_POSITIVE_THRESHOLD,
      confidence: confidence(stats.count),
    })
  }

  // ── Heure du jour ─────────────────────────────────────────────────────────
  const hourBuckets: (keyof typeof CFG.HOUR_LABELS)[] = [
    'night', 'dawn', 'morning', 'midday', 'afternoon', 'dusk',
  ]
  for (const bucket of hourBuckets) {
    const stats = computeConditionStats(
      samples,
      s => bucketizeHour(s.hourLocal) === bucket,
      medianLength
    )
    if (stats.count < 2) continue
    insights.push({
      factor: 'hour',
      label: CFG.HOUR_LABELS[bucket],
      description: makeDescription(stats.catchRate, stats.count, hasLengthData),
      catchRate: stats.catchRate,
      sampleCount: stats.count,
      isPositive: stats.catchRate >= CFG.CATCH_RATE_POSITIVE_THRESHOLD,
      confidence: confidence(stats.count),
    })
  }

  // ── Saison ────────────────────────────────────────────────────────────────
  const seasonBuckets: (keyof typeof CFG.SEASON_LABELS)[] = [
    'spring', 'summer', 'autumn', 'winter',
  ]
  for (const bucket of seasonBuckets) {
    const stats = computeConditionStats(
      samples,
      s => bucketizeSeason(s.monthLocal) === bucket,
      medianLength
    )
    if (stats.count < 1) continue
    insights.push({
      factor: 'season',
      label: CFG.SEASON_LABELS[bucket],
      description: makeDescription(stats.catchRate, stats.count, hasLengthData),
      catchRate: stats.catchRate,
      sampleCount: stats.count,
      isPositive: stats.catchRate >= CFG.CATCH_RATE_POSITIVE_THRESHOLD,
      confidence: confidence(stats.count),
    })
  }

  return insights
    .sort((a, b) => b.catchRate - a.catchRate)
    .slice(0, 6)
}

// ─── computePersonalMultiplier ────────────────────────────────────────────────

export function computePersonalMultiplier(samples: CatchSample[]): PersonalMultiplier {
  const now = new Date().toISOString()
  const neutral = (): PersonalMultiplier => ({
    wind: CFG.MULTIPLIER_NEUTRAL,
    tide: CFG.MULTIPLIER_NEUTRAL,
    solunar: CFG.MULTIPLIER_NEUTRAL,
    computedAt: now,
    basedOnCatches: samples.length,
  })

  if (samples.length < CFG.MIN_CATCHES_FOR_MULTIPLIER) return neutral()

  const medianLength = computeMedianLength(samples)
  const { MIN: _min, MAX: _max } = { MIN: CFG.MULTIPLIER_MIN, MAX: CFG.MULTIPLIER_MAX }

  // ── Multiplicateur vent ───────────────────────────────────────────────────
  // catchRate_light / avg(catchRates_all_buckets_with_data)
  // Vent léger = condition optimale générique → si l'user y pêche mieux → boost
  const windBuckets = Object.keys(CFG.WIND_BUCKETS) as (keyof typeof CFG.WIND_BUCKETS)[]
  const windBucketStats = windBuckets.map(b => ({
    bucket: b,
    stats: computeConditionStats(samples, s => bucketizeWind(s.windSpeedKmh) === b, medianLength),
  }))
  const lightStats = windBucketStats.find(x => x.bucket === 'light')!.stats
  const bucketsWithData = windBucketStats.filter(x => x.stats.count > 0)
  const avgWindCatchRate =
    bucketsWithData.length > 0
      ? bucketsWithData.reduce((sum, x) => sum + x.stats.catchRate, 0) / bucketsWithData.length
      : 0.5
  const rawWind =
    lightStats.count >= 2
      ? lightStats.catchRate / Math.max(0.1, avgWindCatchRate)
      : CFG.MULTIPLIER_NEUTRAL

  if (rawWind > CFG.MULTIPLIER_MAX || rawWind < CFG.MULTIPLIER_MIN) {
    console.warn(
      `[scoring] multiplicateur vent aberrant (${rawWind.toFixed(2)}) → clampé`
    )
  }
  const wind = clamp(rawWind, CFG.MULTIPLIER_MIN, CFG.MULTIPLIER_MAX)

  // ── Multiplicateur marée ──────────────────────────────────────────────────
  // catchRate_rising / catchRate_moyen (rising = condition la plus favorable en général)
  const overallStats = computeConditionStats(samples, () => true, medianLength)
  const avgCatchRate = Math.max(0.1, overallStats.catchRate)
  const risingStats = computeConditionStats(
    samples,
    s => s.tideState === 'rising',
    medianLength
  )
  const rawTide =
    risingStats.count >= 2 ? risingStats.catchRate / avgCatchRate : CFG.MULTIPLIER_NEUTRAL

  if (rawTide > CFG.MULTIPLIER_MAX || rawTide < CFG.MULTIPLIER_MIN) {
    console.warn(
      `[scoring] multiplicateur marée aberrant (${rawTide.toFixed(2)}) → clampé`
    )
  }
  const tide = clamp(rawTide, CFG.MULTIPLIER_MIN, CFG.MULTIPLIER_MAX)

  // ── Multiplicateur solunar (via heure du jour) ────────────────────────────
  // (catchRate_dawn + catchRate_dusk) / (2 × catchRate_midday)
  const dawnStats = computeConditionStats(
    samples,
    s => bucketizeHour(s.hourLocal) === 'dawn',
    medianLength
  )
  const duskStats = computeConditionStats(
    samples,
    s => bucketizeHour(s.hourLocal) === 'dusk',
    medianLength
  )
  const middayStats = computeConditionStats(
    samples,
    s => bucketizeHour(s.hourLocal) === 'midday',
    medianLength
  )

  const hasSolunarData =
    dawnStats.count >= 1 && duskStats.count >= 1 && middayStats.count >= 1
  const rawSolunar =
    hasSolunarData && middayStats.catchRate > 0.05
      ? (dawnStats.catchRate + duskStats.catchRate) / (2 * middayStats.catchRate)
      : CFG.MULTIPLIER_NEUTRAL

  if (rawSolunar > CFG.MULTIPLIER_MAX || rawSolunar < CFG.MULTIPLIER_MIN) {
    console.warn(
      `[scoring] multiplicateur solunar aberrant (${rawSolunar.toFixed(2)}) → clampé`
    )
  }
  const solunar = clamp(rawSolunar, CFG.MULTIPLIER_MIN, CFG.MULTIPLIER_MAX)

  return { wind, tide, solunar, computedAt: now, basedOnCatches: samples.length }
}

// ─── computePersonalProfile ───────────────────────────────────────────────────

export function computePersonalProfile(
  userId: string,
  catches: DbCatch[]
): PersonalProfile {
  const samples = toCatchSamples(catches)
  const insights = computeInsights(samples)
  const multiplier = computePersonalMultiplier(samples)
  const hasEnoughData = samples.length >= CFG.MIN_CATCHES_FOR_INSIGHTS

  return { userId, insights, multiplier, hasEnoughData }
}
