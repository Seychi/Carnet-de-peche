// ─── Overlay perso sur la fenêtre du lendemain (sprint 72) ─────────────────────
// PUR (aucune I/O). RÈGLE DU BRIEF respectée à la lettre : on RÉUTILISE la
// décomposition de score existante, on n'invente PAS un nouveau barème.
//
// ★ ADAPTATEUR MINCE, DOCUMENTÉ (le brief le prévoit explicitement) :
// l'existant expose DÉJÀ un score de fenêtre complet 0-100 (FishingWindow.score,
// lib/solunar/scoring.scoreWindow = astro S6 + marée + vent S19, poids 40/35/25).
// Le « score 0-100 de la fenêtre du lendemain » EST donc ce score, inchangé.
//
// L'overlay perso (S22, descriptif) n'ajoute AUCUN point : le multiplicateur perso
// a été retiré au sprint 22 précisément parce qu'il était indémontrable (contrainte
// 7.5). Ce que le perso apporte ici, honnêtement :
//  - le KIND : 'perso' si la fenêtre coïncide avec >= 1 tendance dominante de TES
//    prises (créneau horaire, direction de marée, bucket de vent) ET que ton
//    historique suffit ; sinon 'generique' (cold start).
//  - les MATCHED : les tendances qui coïncident, avec leurs VRAIS comptes
//    (count / sampleCount) — c'est la matière première de la justification
//    (« 6 de tes 7 prises renseignées tombent en marée descendante »), jamais un
//    pourcentage fabriqué.
//
// La direction de marée de la fenêtre est dérivée des hauteurs MESURÉES avec la
// même logique (et les mêmes constantes) que scoreTide — pas une 2e vérité.

import { dailyMarnage } from '@/lib/conditions/tide'
import type { TidePoint } from '@/lib/conditions/spot-forecast'
import { SOLUNAR_CONFIG } from '@/lib/solunar/config'
import { getParisHour } from '@/lib/solunar/format'
import { bucketizeWind } from '@/lib/scoring/personal/buckets'
import { HOUR_LABELS, TIDE_LABELS, WIND_LABELS } from '@/lib/scoring/personal/config'
import { windowHourBucket } from '@/lib/scoring/personal/window-match'
import type { PersonalTendencies, Tendency, TendencyFactor } from '@/lib/scoring/personal/types'
import type {
  AlertWindowSignal,
  MatchedTendency,
  PersonalTrendSummary,
  TideDirection,
  WindowOverlay,
} from './types'

// ─── Résumé des tendances (contrat PersonalTrendSummary) ───────────────────────

export function summarizeTendencies(t: PersonalTendencies): PersonalTrendSummary {
  return { hasEnough: t.hasEnough, sampleCount: t.sampleCount, confidence: t.confidence }
}

// ─── Direction de marée sur la fenêtre ─────────────────────────────────────────
// Miroir EXACT de la sélection de points et du seuil d'étale de scoreTide
// (lib/solunar/scoring) : heures LOCALES Paris, gestion du franchissement de
// minuit, étale RELATIVE au marnage plafonnée à 0,1 m. On expose la DIRECTION que
// scoreTide garde interne — même donnée, même calcul, zéro invention.

export function tideDirectionForWindow(
  windowStartISO: string,
  windowEndISO: string,
  tidePoints: TidePoint[],
): TideDirection | null {
  if (tidePoints.length === 0) return null

  const startHour = getParisHour(new Date(windowStartISO))
  const endHour = getParisHour(new Date(windowEndISO))
  const inWindow =
    startHour <= endHour
      ? (h: number) => h >= startHour && h <= endHour
      : (h: number) => h >= startHour

  const windowPoints = tidePoints.filter((p) => inWindow(p.hour))
  if (windowPoints.length < 2) return null

  const delta = windowPoints[windowPoints.length - 1].height_m - windowPoints[0].height_m

  const marnageM = dailyMarnage(tidePoints)
  const slack =
    marnageM != null
      ? Math.min(
          SOLUNAR_CONFIG.TIDE.SLACK_DELTA_MAX_M,
          marnageM * SOLUNAR_CONFIG.TIDE.SLACK_DELTA_RATIO,
        )
      : SOLUNAR_CONFIG.TIDE.SLACK_DELTA_MAX_M

  if (Math.abs(delta) < slack) return 'slack'
  return delta > 0 ? 'rising' : 'falling'
}

// ─── Overlay ───────────────────────────────────────────────────────────────────

/** Nombre minimal de tendances coïncidentes pour qualifier une fenêtre « perso ». */
export const MIN_MATCHED_FACTORS = 1

function dominantFor(t: PersonalTendencies, factor: TendencyFactor): Tendency | null {
  return t.tendencies.find((x) => x.factor === factor && x.label != null) ?? null
}

function toMatched(factor: MatchedTendency['factor'], t: Tendency): MatchedTendency {
  return {
    factor,
    label: t.label ?? '',
    count: t.count,
    sampleCount: t.sampleCount,
    share: t.share,
  }
}

/**
 * Croise la fenêtre du lendemain avec les tendances perso (S22).
 *
 * - `score` = score générique de la fenêtre, INCHANGÉ (adaptateur mince, cf en-tête).
 * - `matched` = tendances dominantes qui coïncident avec les signaux de la fenêtre,
 *   dans l'ordre hour → tide → wind (du plus fiable au moins fiable).
 * - `kind` = 'perso' si historique suffisant ET >= MIN_MATCHED_FACTORS coïncidence ;
 *   'generique' sinon (la décision d'envoyer ou non reste dans decision.ts).
 */
export function computeWindowOverlay(
  window: AlertWindowSignal,
  tendencies: PersonalTendencies,
): WindowOverlay {
  const matched: MatchedTendency[] = []

  if (tendencies.hasEnough) {
    // Créneau horaire (toujours dérivable des deux côtés — signal le plus fiable).
    const hourDom = dominantFor(tendencies, 'hour')
    if (hourDom) {
      const winHourLabel = HOUR_LABELS[windowHourBucket(window.startTimeISO)]
      if (winHourLabel === hourDom.label) matched.push(toMatched('hour', hourDom))
    }

    // Direction de marée (seulement si mesurée sur la fenêtre, jamais devinée).
    const tideDom = dominantFor(tendencies, 'tide')
    if (tideDom && window.tideDirection) {
      if (TIDE_LABELS[window.tideDirection] === tideDom.label) {
        matched.push(toMatched('tide', tideDom))
      }
    }

    // Bucket de vent (seulement si le vent de la fenêtre est connu).
    const windDom = dominantFor(tendencies, 'wind')
    if (windDom && window.windSpeedKmh != null) {
      const bucket = bucketizeWind(window.windSpeedKmh)
      if (bucket && WIND_LABELS[bucket] === windDom.label) {
        matched.push(toMatched('wind', windDom))
      }
    }
  }

  const isPerso = tendencies.hasEnough && matched.length >= MIN_MATCHED_FACTORS

  return {
    score: window.score,
    kind: isPerso ? 'perso' : 'generique',
    matched: isPerso ? matched : [],
    trends: summarizeTendencies(tendencies),
  }
}
