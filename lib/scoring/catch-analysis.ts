import type {
  CatchSample,
  ConditionStats,
  WindBucket,
  HourBucket,
  SeasonBucket,
  TideStateBucket,
} from './types'

// ─── Type DB ──────────────────────────────────────────────────────────────────
// Sous-ensemble des colonnes catches nécessaires au scoring.

export type DbCatch = {
  id: string
  user_id: string
  caught_at: string
  size_cm: number | null
  wind_speed_kmh: number | null
  wind_direction_deg: number | null
  tide_state: 'rising' | 'falling' | 'slack' | null
  spot_id: string | null
}

// ─── Helpers timezone ─────────────────────────────────────────────────────────

function getParisHour(date: Date): number {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(date)
  const h = parts.find(p => p.type === 'hour')
  return h ? parseInt(h.value, 10) % 24 : date.getUTCHours()
}

function getParisMonth(date: Date): number {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    month: 'numeric',
  }).formatToParts(date)
  const m = parts.find(p => p.type === 'month')
  return m ? parseInt(m.value, 10) : date.getUTCMonth() + 1
}

// ─── Mapping DB → CatchSample ─────────────────────────────────────────────────

export function toCatchSamples(catches: DbCatch[]): CatchSample[] {
  return catches.map(c => {
    const date = new Date(c.caught_at)
    return {
      caughtAt: date,
      lengthCm: c.size_cm,
      windSpeedKmh: c.wind_speed_kmh,
      windDirectionDeg: c.wind_direction_deg,
      tideState: (c.tide_state as TideStateBucket | null) ?? 'unknown',
      hourLocal: getParisHour(date),
      monthLocal: getParisMonth(date),
    }
  })
}

// ─── Bucketizers ──────────────────────────────────────────────────────────────

export function bucketizeWind(speedKmh: number | null): WindBucket {
  if (speedKmh === null) return 'calm'
  if (speedKmh < 5) return 'calm'
  if (speedKmh < 15) return 'light'
  if (speedKmh < 25) return 'moderate'
  if (speedKmh < 40) return 'strong'
  return 'gale'
}

export function bucketizeHour(hourLocal: number): HourBucket {
  const h = ((hourLocal % 24) + 24) % 24
  if (h >= 23 || h < 4) return 'night'
  if (h < 7) return 'dawn'
  if (h < 11) return 'morning'
  if (h < 14) return 'midday'
  if (h < 18) return 'afternoon'
  return 'dusk'
}

export function bucketizeSeason(monthLocal: number): SeasonBucket {
  if (monthLocal >= 3 && monthLocal <= 5) return 'spring'
  if (monthLocal >= 6 && monthLocal <= 8) return 'summer'
  if (monthLocal >= 9 && monthLocal <= 11) return 'autumn'
  return 'winter'
}

// ─── Médiane des tailles ──────────────────────────────────────────────────────

export function computeMedianLength(samples: CatchSample[]): number | null {
  const lengths = samples
    .map(s => s.lengthCm)
    .filter((l): l is number => l !== null)
    .sort((a, b) => a - b)

  if (lengths.length === 0) return null

  const mid = Math.floor(lengths.length / 2)
  return lengths.length % 2 === 0
    ? (lengths[mid - 1] + lengths[mid]) / 2
    : lengths[mid]
}

// ─── Statistiques par condition ───────────────────────────────────────────────

export function computeConditionStats(
  samples: CatchSample[],
  filter: (s: CatchSample) => boolean,
  medianLength: number | null
): ConditionStats {
  const filtered = samples.filter(filter)
  const count = filtered.length

  const withLength = filtered.filter(s => s.lengthCm !== null)
  const avgLength =
    withLength.length > 0
      ? withLength.reduce((sum, s) => sum + s.lengthCm!, 0) / withLength.length
      : null

  let catchRate: number
  if (medianLength !== null) {
    // Part des prises au-dessus de la médiane parmi celles ayant une taille
    const aboveMedian = withLength.filter(s => s.lengthCm! > medianLength).length
    catchRate = withLength.length > 0 ? aboveMedian / withLength.length : 0
  } else {
    // Pas de données de taille : catch rate brut = part des prises dans ce contexte
    catchRate = samples.length > 0 ? count / samples.length : 0
  }

  return { count, avgLength, catchRate }
}
