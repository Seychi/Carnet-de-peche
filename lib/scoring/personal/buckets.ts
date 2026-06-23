import type { CatchSample } from './types'

// Sous-ensemble des colonnes de `catches_for_viewer` nécessaires au perso.
export type DbCatchRow = {
  species?: string | null
  spot_id?: string | null
  caught_at: string
  wind_speed_kmh?: number | null
  tide_state?: string | null
  conditions?: unknown
}

export type WindBucket = 'calm' | 'light' | 'moderate' | 'strong' | 'gale'
export type HourBucket = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk'
export type SeasonBucket = 'spring' | 'summer' | 'autumn' | 'winter'

// ─── Découpage horaire/calendaire en Europe/Paris ─────────────────────────────
// Un seul calcul TZ mutualisé (avant : dupliqué entre catch-analysis et insights).
function parisParts(d: Date): { hour: number; month: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    hour12: false,
    month: '2-digit',
    weekday: 'short',
  }).formatToParts(d)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? ''
  const hour = parseInt(get('hour'), 10) % 24
  const month = parseInt(get('month'), 10)
  const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const weekday = WD[get('weekday')] ?? 0
  return { hour, month, weekday }
}

// ─── Bucketizers ──────────────────────────────────────────────────────────────

// null = PAS de donnée (≠ « calme »). On ne conflate jamais l'absence de vent avec
// le calme — sinon les prises sans vent fausseraient la tendance « vent ».
export function bucketizeWind(speed: number | null): WindBucket | null {
  if (speed === null || speed === undefined || Number.isNaN(speed)) return null
  if (speed < 5) return 'calm'
  if (speed < 15) return 'light'
  if (speed < 25) return 'moderate'
  if (speed < 40) return 'strong'
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

// ─── Réconciliation vent colonne ↔ jsonb (WS-A tâche 3) ───────────────────────
// La colonne dénormalisée `wind_speed_kmh` est parfois nulle alors que le snapshot
// jsonb la porte (désync mesurée 5/16 vs 12/16). On préfère la colonne, fallback jsonb.
function windFromRow(row: DbCatchRow): number | null {
  if (row.wind_speed_kmh !== null && row.wind_speed_kmh !== undefined) return row.wind_speed_kmh
  const c = row.conditions as { wind_speed_kmh?: number | null } | null | undefined
  const j = c?.wind_speed_kmh
  return j === null || j === undefined ? null : j
}

function isOutOfCoverage(row: DbCatchRow): boolean {
  const c = row.conditions as { out_of_coverage?: boolean } | null | undefined
  return c?.out_of_coverage === true
}

// ─── DB → CatchSample ─────────────────────────────────────────────────────────
export function toCatchSamples(rows: DbCatchRow[]): CatchSample[] {
  return rows
    // Hors France métropolitaine : conditions non calculées → exclu du perso.
    .filter((r) => !isOutOfCoverage(r))
    .map((r) => {
      const d = new Date(r.caught_at)
      const { hour, month, weekday } = parisParts(d)
      const ts = r.tide_state
      return {
        species: r.species ?? null,
        spotId: r.spot_id ?? null,
        caughtAt: d,
        windSpeedKmh: windFromRow(r),
        tideState: ts === 'rising' || ts === 'falling' || ts === 'slack' ? ts : null,
        hourLocal: hour,
        monthLocal: month,
        weekdayLocal: weekday,
      }
    })
}
