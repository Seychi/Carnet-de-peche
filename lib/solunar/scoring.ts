import type { SolunarEvent, ScoringFactors, QualityLevel } from './types'
import type { TidePoint, TideExtremum } from '@/lib/conditions/spot-forecast'
import { SOLUNAR_CONFIG } from './config'

// ─── Scoring solunar ─────────────────────────────────────────────────────────

export function scoreSolunar(centerEvent: SolunarEvent): number {
  const base = SOLUNAR_CONFIG.SOLUNAR_WEIGHTS[centerEvent.type]

  // Bonus nouvelle lune (0) ou pleine lune (~0.5)
  let moonBonus = 1.0
  if (centerEvent.moonPhase !== undefined) {
    const phase = centerEvent.moonPhase
    const isNewMoon = phase < 0.05 || phase > 0.95
    const isFullMoon = phase > 0.45 && phase < 0.55
    if (isNewMoon || isFullMoon) moonBonus = 1.2
  }

  return Math.min(1.0, base * moonBonus)
}

// ─── Scoring marée ───────────────────────────────────────────────────────────

export function scoreTide(
  windowStartISO: string,
  windowEndISO: string,
  tidePoints: TidePoint[],
  tideExtrema: TideExtremum[]
): number {
  // Si pas de données de marée (v1 : Open-Meteo ne fournit pas de marées),
  // retourne le score neutre. À améliorer quand tidePoints sera rempli.
  if (tidePoints.length === 0) return 0.5

  const startMs = new Date(windowStartISO).getTime()
  const endMs = new Date(windowEndISO).getTime()

  // Heures couvrant la fenêtre
  const startHour = new Date(windowStartISO).getUTCHours()
  const endHour = new Date(windowEndISO).getUTCHours()

  // Points de marée dans la fenêtre
  const windowPoints = tidePoints.filter(p => p.hour >= startHour && p.hour <= endHour)
  if (windowPoints.length < 2) return 0.5

  // Direction : montante ou descendante
  const first = windowPoints[0].height_m
  const last = windowPoints[windowPoints.length - 1].height_m
  const delta = last - first

  let tideScore: number
  if (Math.abs(delta) < 0.1) {
    tideScore = SOLUNAR_CONFIG.TIDE.SLACK_BONUS
  } else if (delta > 0) {
    tideScore = SOLUNAR_CONFIG.TIDE.RISING_BONUS + 0.6 // montante = 1.0 max
  } else {
    tideScore = SOLUNAR_CONFIG.TIDE.FALLING_BONUS + 0.6 // descendante = 0.8 max
  }

  // Bonus si un extremum (basse/haute mer) tombe dans la fenêtre
  const hasExtremum = tideExtrema.some(e => e.hour >= startHour && e.hour <= endHour)
  if (hasExtremum) tideScore = Math.min(1.0, tideScore + 0.2)

  return Math.min(1.0, Math.max(0, tideScore))
}

// ─── Scoring vent ─────────────────────────────────────────────────────────────

export function scoreWind(windSpeed_kmh: number | null): number {
  if (windSpeed_kmh === null) return 0.7 // neutre si inconnu

  const v = windSpeed_kmh

  if (v < 5) return 0.9
  if (v <= 15) return 1.0
  if (v <= 25) {
    // Décroissance linéaire 1.0 → 0.5
    return 1.0 - ((v - 15) / 10) * 0.5
  }
  if (v <= 35) {
    // Décroissance linéaire 0.5 → 0.2
    return 0.5 - ((v - 25) / 10) * 0.3
  }
  return 0.1
}

// ─── Assemblage final ─────────────────────────────────────────────────────────

function formatEventReason(event: SolunarEvent): string {
  const labels: Record<string, string> = {
    sunrise: 'Lever de soleil',
    sunset: 'Coucher de soleil',
    moonrise: 'Lever de lune',
    moonset: 'Coucher de lune',
    moon_apex: 'Lune au zénith',
    moon_nadir: 'Lune au nadir',
  }
  return labels[event.type] ?? event.type
}

export function scoreWindow(
  centerEvent: SolunarEvent,
  windowStartISO: string,
  windowEndISO: string,
  tidePoints: TidePoint[],
  tideExtrema: TideExtremum[],
  windSpeed_kmh: number | null
): { score: number; factors: ScoringFactors } {
  const solunar = scoreSolunar(centerEvent)
  const tide = scoreTide(windowStartISO, windowEndISO, tidePoints, tideExtrema)
  const wind = scoreWind(windSpeed_kmh)

  const score01 =
    solunar * SOLUNAR_CONFIG.WEIGHTS.solunar +
    tide * SOLUNAR_CONFIG.WEIGHTS.tide +
    wind * SOLUNAR_CONFIG.WEIGHTS.wind

  const score = Math.round(Math.min(100, Math.max(0, score01 * 100)))

  const reasons: string[] = []
  reasons.push(formatEventReason(centerEvent))
  if (tide > 0.7 && tidePoints.length > 0) reasons.push('Marée favorable')
  if (wind > 0.85) reasons.push('Vent idéal')
  else if (wind < 0.3) reasons.push('Vent fort')

  return { score, factors: { solunar, tide, wind, reasons } }
}

// ─── Qualité depuis score ─────────────────────────────────────────────────────

export function qualityFromScore(score: number): QualityLevel {
  if (score >= SOLUNAR_CONFIG.QUALITY_THRESHOLDS.exceptionnelle) return 'exceptionnelle'
  if (score >= SOLUNAR_CONFIG.QUALITY_THRESHOLDS.tres_bonne) return 'tres_bonne'
  if (score >= SOLUNAR_CONFIG.QUALITY_THRESHOLDS.bonne) return 'bonne'
  if (score >= SOLUNAR_CONFIG.QUALITY_THRESHOLDS.moyenne) return 'moyenne'
  return 'faible'
}
