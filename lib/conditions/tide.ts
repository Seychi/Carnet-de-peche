import type { TidePoint, TideExtremum } from './spot-forecast'

// ─── Logique de marée (pure, testable) ────────────────────────────────────────
// Tout est dérivé des hauteurs horaires RÉELLES Open-Meteo (sea_level_height_msl).
// Aucune valeur de coefficient inventée : le « marnage » est l'amplitude mesurée.

export type TideTrend = 'rising' | 'falling' | 'slack'

// Sous ce delta horaire (m) on considère la marée étale.
const TREND_EPS_M = 0.03

/**
 * Tendance (montante / descendante / étale) à une heure donnée, calculée à
 * partir des points horaires encadrants. `hour` peut être fractionnaire.
 */
export function tideTrendAt(points: TidePoint[], hour: number): TideTrend {
  if (points.length < 2) return 'slack'
  const byHour = new Map(points.map((p) => [p.hour, p.height_m]))
  const h = Math.round(hour)
  const prev = byHour.get(h - 1)
  const next = byHour.get(h + 1)
  const cur = byHour.get(h)

  let delta: number
  if (prev !== undefined && next !== undefined) delta = next - prev
  else if (next !== undefined && cur !== undefined) delta = next - cur
  else if (prev !== undefined && cur !== undefined) delta = cur - prev
  else return 'slack'

  if (Math.abs(delta) < TREND_EPS_M) return 'slack'
  return delta > 0 ? 'rising' : 'falling'
}

/**
 * Estimation sub-horaire de l'heure d'un extremum (PM/BM) par interpolation
 * parabolique des 3 points horaires autour du sommet. La source est horaire,
 * donc c'est une approximation honnête (± quelques minutes), pas une mesure SHOM.
 * Retourne une heure fractionnaire bornée à [hour-0.5, hour+0.5].
 */
export function refineExtremumHour(points: TidePoint[], hour: number): number {
  const byHour = new Map(points.map((p) => [p.hour, p.height_m]))
  const y0 = byHour.get(hour)
  const ym = byHour.get(hour - 1)
  const yp = byHour.get(hour + 1)
  if (y0 === undefined || ym === undefined || yp === undefined) return hour
  const denom = ym - 2 * y0 + yp
  if (Math.abs(denom) < 1e-6) return hour
  let offset = (0.5 * (ym - yp)) / denom
  if (!isFinite(offset)) return hour
  offset = Math.max(-0.5, Math.min(0.5, offset))
  return hour + offset
}

/**
 * Marnage du jour = amplitude entre la plus basse et la plus haute hauteur
 * observée dans la journée (m). Mesuré, jamais inventé. Null si pas de données.
 */
export function dailyMarnage(points: TidePoint[]): number | null {
  if (points.length === 0) return null
  const hs = points.map((p) => p.height_m)
  return Math.max(...hs) - Math.min(...hs)
}

export type UpcomingExtremum = {
  type: 'high' | 'low'
  hourFraction: number
  height_m: number
}

/**
 * Prochaines PM et BM à venir aujourd'hui (≥ heure courante), avec heure
 * raffinée. Null pour un type s'il n'en reste plus dans la journée.
 */
export function upcomingExtrema(
  points: TidePoint[],
  extrema: TideExtremum[],
  currentHour: number,
): { high: UpcomingExtremum | null; low: UpcomingExtremum | null } {
  const refined = extrema
    .map((e) => ({
      type: e.type,
      hourFraction: refineExtremumHour(points, e.hour),
      height_m: e.height_m,
    }))
    .sort((a, b) => a.hourFraction - b.hourFraction)

  // tolérance -0.02h pour ne pas masquer un extremum « à l'instant »
  const high = refined.find((e) => e.type === 'high' && e.hourFraction >= currentHour - 0.02) ?? null
  const low = refined.find((e) => e.type === 'low' && e.hourFraction >= currentHour - 0.02) ?? null
  return { high, low }
}

// ─── Formatage ────────────────────────────────────────────────────────────────

/** 14.53 → "14h32". */
export function formatHourFraction(hf: number): string {
  let h = Math.floor(hf)
  let m = Math.round((hf - h) * 60)
  if (m === 60) {
    m = 0
    h += 1
  }
  return `${h}h${String(m).padStart(2, '0')}`
}

/** Compte à rebours lisible : 2.25 → "dans 2 h 15". */
export function formatCountdown(deltaHours: number): string {
  if (deltaHours <= 0) return 'maintenant'
  const totalMin = Math.round(deltaHours * 60)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `dans ${m} min`
  if (m === 0) return `dans ${h} h`
  return `dans ${h} h ${String(m).padStart(2, '0')}`
}

const TREND_LABELS: Record<TideTrend, string> = {
  rising: 'Montante',
  falling: 'Descendante',
  slack: 'Étale',
}

export function trendLabel(t: TideTrend): string {
  return TREND_LABELS[t]
}
