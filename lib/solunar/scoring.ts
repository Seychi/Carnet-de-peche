import type { SolunarEvent, ScoringFactors, QualityLevel } from './types'
import type { TidePoint, TideExtremum } from '@/lib/conditions/spot-forecast'
import { SOLUNAR_CONFIG } from './config'
import { getParisHour } from './format'
import { dailyMarnage } from '@/lib/conditions/tide'

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

  // Heures (LOCALES Paris) couvrant la fenêtre. CORRECTIF sprint 24 : les `tidePoints`
  // sont indexés par heure LOCALE (Open-Meteo timezone=Europe/Paris) ; les bornes de
  // fenêtre sont des instants ISO (UTC). Lire getUTCHours() décalait la sélection de
  // 1-2 h (selon l'heure d'été) → mauvais créneau de marée. On lit l'heure de Paris.
  const startHour = getParisHour(new Date(windowStartISO))
  const endHour = getParisHour(new Date(windowEndISO))

  // Fenêtre qui enjambe minuit (ex. centre ~23h) : endHour < startHour. On garde la
  // portion AVANT minuit ([startHour, 23]) — les points d'après minuit appartiennent
  // au jour suivant (absents de ce tableau horaire) ; ne PAS rabattre sur [0, endHour]
  // (ce serait les points du petit matin du même jour → fausse direction).
  const inWindow =
    startHour <= endHour
      ? (h: number) => h >= startHour && h <= endHour
      : (h: number) => h >= startHour

  // Points de marée dans la fenêtre
  const windowPoints = tidePoints.filter((p) => inWindow(p.hour))
  if (windowPoints.length < 2) return SOLUNAR_CONFIG.TIDE.NO_DATA_SCORE

  // Direction : montante ou descendante
  const first = windowPoints[0].height_m
  const last = windowPoints[windowPoints.length - 1].height_m
  const delta = last - first

  // Seuil d'étale RELATIF au marnage local (plafonné à 0.1 m → Atlantique inchangé).
  const marnageM = dailyMarnage(tidePoints)
  const slack =
    marnageM != null
      ? Math.min(SOLUNAR_CONFIG.TIDE.SLACK_DELTA_MAX_M, marnageM * SOLUNAR_CONFIG.TIDE.SLACK_DELTA_RATIO)
      : SOLUNAR_CONFIG.TIDE.SLACK_DELTA_MAX_M

  let tideScore: number
  if (Math.abs(delta) < slack) {
    tideScore = SOLUNAR_CONFIG.TIDE.SLACK_SCORE
  } else if (delta > 0) {
    tideScore = SOLUNAR_CONFIG.TIDE.RISING_SCORE // montante : 1.0 atteignable avec extremum
  } else {
    tideScore = SOLUNAR_CONFIG.TIDE.FALLING_SCORE // descendante : 0.8 max avec extremum
  }

  // Bonus si un extremum (basse/haute mer) tombe dans la fenêtre
  const hasExtremum = tideExtrema.some((e) => inWindow(e.hour))
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
  windSpeed_kmh: number | null
): { score: number; factors: ScoringFactors } {
  // Scoring GÉNÉRIQUE (solunar + marée + vent). Le multiplicateur perso a été
  // retiré (sprint 22) : il était neutralisé depuis 7.5 et n'était alimenté par
  // AUCUN call-site. Le perso vit désormais à part, en TENDANCES descriptives
  // (lib/scoring/personal), jamais en multiplicateur prédictif.
  const solunar = scoreSolunar(centerEvent)
  const wind = scoreWind(windSpeed_kmh)

  // Marnage journalier MESURÉ. CORRECTIF sprint 24 (Med honnête) : sous le seuil
  // neutre, la marée est physiquement non discriminante (Méditerranée). Au lieu de
  // l'imposer à 0/35 (faux négatif), on RETIRE son poids et on le RENORMALISE sur
  // astro + vent — rien d'inventé, juste une répartition honnête.
  const marnageM = dailyMarnage(tidePoints)
  const W = SOLUNAR_CONFIG.WEIGHTS
  const tideNonDiscriminating = marnageM != null && marnageM < SOLUNAR_CONFIG.TIDE.NEUTRAL_MARNAGE_M

  let tide: number
  let weights: { solunar: number; tide: number; wind: number }
  if (tideNonDiscriminating) {
    tide = 0 // non utilisé (poids 0) — la marée plate ne pèse plus dans le score
    const renorm = W.solunar + W.wind
    weights = { solunar: W.solunar / renorm, tide: 0, wind: W.wind / renorm }
  } else {
    tide = scoreTide(windowStartISO, windowEndISO, tidePoints, tideExtrema)
    weights = { solunar: W.solunar, tide: W.tide, wind: W.wind }
  }

  const score01 = solunar * weights.solunar + tide * weights.tide + wind * weights.wind
  const score = Math.round(Math.min(100, Math.max(0, score01 * 100)))

  const reasons: string[] = []
  reasons.push(formatEventReason(centerEvent))
  if (tideNonDiscriminating) reasons.push('Marée plate (peu déterminante)')
  else if (tide > 0.7 && tidePoints.length > 0) reasons.push('Marée favorable')
  if (wind > 0.85) reasons.push('Vent idéal')
  else if (wind < 0.3) reasons.push('Vent fort')

  return { score, factors: { solunar, tide, wind, reasons, weights, marnageM, tideNonDiscriminating } }
}

// ─── Qualité depuis score ─────────────────────────────────────────────────────

export function qualityFromScore(score: number): QualityLevel {
  if (score >= SOLUNAR_CONFIG.QUALITY_THRESHOLDS.exceptionnelle) return 'exceptionnelle'
  if (score >= SOLUNAR_CONFIG.QUALITY_THRESHOLDS.tres_bonne) return 'tres_bonne'
  if (score >= SOLUNAR_CONFIG.QUALITY_THRESHOLDS.bonne) return 'bonne'
  if (score >= SOLUNAR_CONFIG.QUALITY_THRESHOLDS.moyenne) return 'moyenne'
  return 'faible'
}
