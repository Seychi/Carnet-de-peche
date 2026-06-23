import type { SolunarEvent, ScoringFactors, QualityLevel } from './types'
import type { TidePoint, TideExtremum } from '@/lib/conditions/spot-forecast'
import type { PersonalMultiplier } from '@/lib/scoring/types'
import { SOLUNAR_CONFIG } from './config'

// ─── Scoring solunar ─────────────────────────────────────────────────────────

export function scoreSolunar(centerEvent: SolunarEvent): number {
  const base = SOLUNAR_CONFIG.SOLUNAR_WEIGHTS[centerEvent.type]

  // Bonus nouvelle lune (0) ou pleine lune (~0.5).
  // Le cumul base × bonus est plafonné : seul un événement lunaire majeur
  // (zénith/nadir) EN nouvelle ou pleine lune atteint la composante max.
  let moonBonus = 1.0
  if (centerEvent.moonPhase !== undefined) {
    const phase = centerEvent.moonPhase
    const isNewMoon = phase < 0.05 || phase > 0.95
    const isFullMoon = phase > 0.45 && phase < 0.55
    if (isNewMoon || isFullMoon) moonBonus = SOLUNAR_CONFIG.MOON_PHASE_BONUS
  }

  return Math.min(SOLUNAR_CONFIG.MAX_SOLUNAR_SCORE, base * moonBonus)
}

// ─── Scoring marée ───────────────────────────────────────────────────────────

export function scoreTide(
  windowStartISO: string,
  windowEndISO: string,
  tidePoints: TidePoint[],
  tideExtrema: TideExtremum[]
): number {
  // Pas de données de marée : composante plafonnée sous le neutre (0.35).
  // Sans marée vérifiable, une fenêtre ne peut pas prétendre à « Exceptionnelle ».
  if (tidePoints.length === 0) return SOLUNAR_CONFIG.TIDE.NO_DATA_SCORE

  // Heures couvrant la fenêtre
  const startHour = new Date(windowStartISO).getUTCHours()
  const endHour = new Date(windowEndISO).getUTCHours()

  // Points de marée dans la fenêtre
  const windowPoints = tidePoints.filter(p => p.hour >= startHour && p.hour <= endHour)
  if (windowPoints.length < 2) return SOLUNAR_CONFIG.TIDE.NO_DATA_SCORE

  // Direction : montante ou descendante
  const first = windowPoints[0].height_m
  const last = windowPoints[windowPoints.length - 1].height_m
  const delta = last - first

  let tideScore: number
  if (Math.abs(delta) < 0.1) {
    tideScore = SOLUNAR_CONFIG.TIDE.SLACK_SCORE
  } else if (delta > 0) {
    tideScore = SOLUNAR_CONFIG.TIDE.RISING_SCORE // montante : 1.0 atteignable avec extremum
  } else {
    tideScore = SOLUNAR_CONFIG.TIDE.FALLING_SCORE // descendante : 0.8 max avec extremum
  }

  // Bonus si un extremum (basse/haute mer) tombe dans la fenêtre
  const hasExtremum = tideExtrema.some(e => e.hour >= startHour && e.hour <= endHour)
  if (hasExtremum) tideScore = Math.min(1.0, tideScore + SOLUNAR_CONFIG.TIDE.EXTREMUM_BONUS)

  return Math.min(1.0, Math.max(0, tideScore))
}

// ─── Scoring vent ─────────────────────────────────────────────────────────────

// Courbe vent CONTINUE à pic unique (recalibrage sprint 19). Plus aucun palier plat :
//   null            → UNKNOWN_SCORE (neutre)
//   ≤ CALM_KMH      → CALM_SCORE (mer d'huile, léger retrait — pas de pénalité forte)
//   CALM..IDEAL     → montée linéaire CALM_SCORE → 1.0 (pic à IDEAL_KMH)
//   IDEAL..ACCEPT   → décroissance linéaire 1.0 → ACCEPTABLE_MIN_SCORE
//   ACCEPT..STRONG  → décroissance linéaire ACCEPTABLE_MIN_SCORE → 0
//   ≥ STRONG        → 0
// Continue à chaque borne (CALM, IDEAL, ACCEPTABLE_MAX, STRONG_MAX) → discrimine
// dans toute la bande commune 5–20 km/h (fini le 25/25 figé).
export function scoreWind(windSpeed_kmh: number | null): number {
  const { CALM_KMH, CALM_SCORE, IDEAL_KMH, ACCEPTABLE_MAX_KMH, ACCEPTABLE_MIN_SCORE, STRONG_MAX_KMH, UNKNOWN_SCORE } =
    SOLUNAR_CONFIG.WIND

  if (windSpeed_kmh === null) return UNKNOWN_SCORE // neutre si inconnu

  const v = Math.max(0, windSpeed_kmh)

  if (v <= CALM_KMH) return CALM_SCORE
  if (v <= IDEAL_KMH) {
    // Montée CALM_SCORE → 1.0 (le vent qui se lève réveille l'activité)
    return CALM_SCORE + ((v - CALM_KMH) / (IDEAL_KMH - CALM_KMH)) * (1.0 - CALM_SCORE)
  }
  if (v <= ACCEPTABLE_MAX_KMH) {
    // Décroissance 1.0 → ACCEPTABLE_MIN_SCORE
    return 1.0 - ((v - IDEAL_KMH) / (ACCEPTABLE_MAX_KMH - IDEAL_KMH)) * (1.0 - ACCEPTABLE_MIN_SCORE)
  }
  if (v < STRONG_MAX_KMH) {
    // Décroissance ACCEPTABLE_MIN_SCORE → 0 : un vent fort écrase la composante
    return ACCEPTABLE_MIN_SCORE * (1 - (v - ACCEPTABLE_MAX_KMH) / (STRONG_MAX_KMH - ACCEPTABLE_MAX_KMH))
  }
  return 0
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
  windSpeed_kmh: number | null,
  personalMultiplier?: PersonalMultiplier
): { score: number; factors: ScoringFactors } {
  const solunarRaw = scoreSolunar(centerEvent)
  const tideRaw = scoreTide(windowStartISO, windowEndISO, tidePoints, tideExtrema)
  const windRaw = scoreWind(windSpeed_kmh)

  const { MIN_CATCHES_FOR_MULTIPLIER } = { MIN_CATCHES_FOR_MULTIPLIER: 5 }
  const applyMultiplier =
    personalMultiplier !== undefined &&
    personalMultiplier.basedOnCatches >= MIN_CATCHES_FOR_MULTIPLIER

  const solunar = applyMultiplier
    ? Math.min(solunarRaw * personalMultiplier!.solunar, 1.0)
    : solunarRaw
  const tide = applyMultiplier
    ? Math.min(tideRaw * personalMultiplier!.tide, 1.0)
    : tideRaw
  const wind = applyMultiplier
    ? Math.min(windRaw * personalMultiplier!.wind, 1.0)
    : windRaw

  const score01 =
    solunar * SOLUNAR_CONFIG.WEIGHTS.solunar +
    tide * SOLUNAR_CONFIG.WEIGHTS.tide +
    wind * SOLUNAR_CONFIG.WEIGHTS.wind

  const baseScore01 =
    solunarRaw * SOLUNAR_CONFIG.WEIGHTS.solunar +
    tideRaw * SOLUNAR_CONFIG.WEIGHTS.tide +
    windRaw * SOLUNAR_CONFIG.WEIGHTS.wind

  const score = Math.round(Math.min(100, Math.max(0, score01 * 100)))

  const reasons: string[] = []
  reasons.push(formatEventReason(centerEvent))
  if (tideRaw > 0.7 && tidePoints.length > 0) reasons.push('Marée favorable')
  if (windRaw > 0.85) reasons.push('Vent idéal')
  else if (windRaw < 0.3) reasons.push('Vent fort')

  if (applyMultiplier) {
    const scoreDiff = Math.abs(score - Math.round(baseScore01 * 100))
    if (scoreDiff >= 5) {
      reasons.push(`Personnalisé sur tes ${personalMultiplier!.basedOnCatches} prises`)
    }
  }

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
