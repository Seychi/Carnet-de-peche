// ─── Match créneau-du-jour ↔ tendances perso (le hook de la notif proactive) ──
// Sprint 26, WS-B. PUR (aucune I/O) → testable sans mock. Décide si le créneau
// favorable du jour (lib/conditions/dept-window) « ressemble » aux conditions où
// TES prises tombent (lib/scoring/personal). Si oui ET que le créneau est bon, on
// notifie (in-app seul, Local/Itinérant uniquement — gating fait dans le cron).
//
// ⚠️ CONTRAINTE 7.5 gravée : DESCRIPTIF, jamais prédictif. La copie dit « tes prises
// tombent souvent … — créneau favorable aujourd'hui », JAMAIS « tu prendras » /
// « tu pêches mieux » / « prédit ». On décrit une coïncidence de conditions, on ne
// promet aucun résultat.

import { bucketizeHour, type HourBucket } from './buckets'
import { HOUR_LABELS, TIDE_LABELS } from './config'
import type { PersonalTendencies, Tendency, TendencyFactor } from './types'

// Score minimal du créneau pour qu'il vaille une notif (sinon on n'alerte pas pour
// un créneau médiocre, même s'il « matche »).
export const MIN_WINDOW_SCORE = 60

// Heure (Europe/Paris) d'un instant ISO → libellé court « vers 17h-19h ».
function parisHour(iso: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  return ((h % 24) + 24) % 24
}

/** Bucket horaire (Europe/Paris) du début d'un créneau. */
export function windowHourBucket(startTimeISO: string): HourBucket {
  return bucketizeHour(parisHour(startTimeISO))
}

/** Plage horaire lisible « vers 17h-19h » à partir des bornes du créneau. */
export function windowTimeRange(startTimeISO: string, endTimeISO: string): string {
  const a = parisHour(startTimeISO)
  const b = parisHour(endTimeISO)
  return `vers ${a}h-${b}h`
}

// Tendance dominante d'un facteur (la 1re du tableau trié par part décroissante).
function dominantFor(t: PersonalTendencies, factor: TendencyFactor): Tendency | null {
  return t.tendencies.find((x) => x.factor === factor && x.label != null) ?? null
}

/** Description du créneau du jour, réduite aux signaux comparables au perso. */
export type WindowSignal = {
  startTimeISO: string
  endTimeISO: string
  /** Score 0-100 du créneau (générique, lib/solunar). */
  score: number
}

export type WindowMatch = {
  /** true = on notifierait ce user pour ce créneau aujourd'hui. */
  shouldNotify: boolean
  /** Copie in-app prête (≤ 140 car.), DESCRIPTIVE. null si pas de notif. */
  previewText: string | null
}

/**
 * Décide si on notifie ce user pour le créneau du jour, et compose la copie.
 *
 * Règle de match (volontairement simple et HONNÊTE) :
 *  - le user a assez de prises pour des tendances (`hasEnough`) ;
 *  - le créneau est réellement bon (`score >= MIN_WINDOW_SCORE`) ;
 *  - le bucket HORAIRE du créneau coïncide avec le créneau horaire dominant de TES
 *    prises (signal le plus fiable, toujours dérivable des deux côtés).
 *
 * Le créneau solunar n'expose pas proprement la DIRECTION de marée → on ne s'en sert
 * que pour ENRICHIR la copie (« en marée descendante » si c'est ta tendance), jamais
 * comme condition de match (pas d'invention).
 */
export function matchPersonalWindow(
  tendencies: PersonalTendencies,
  window: WindowSignal,
): WindowMatch {
  const noMatch: WindowMatch = { shouldNotify: false, previewText: null }

  if (!tendencies.hasEnough) return noMatch
  if (window.score < MIN_WINDOW_SCORE) return noMatch

  const hourDom = dominantFor(tendencies, 'hour')
  if (!hourDom) return noMatch

  // Le créneau du jour tombe-t-il dans TON créneau horaire dominant ?
  const winBucket = windowHourBucket(window.startTimeISO)
  const winHourLabel = HOUR_LABELS[winBucket]
  if (winHourLabel !== hourDom.label) return noMatch

  // Enrichissement marée (descriptif, jamais une condition) : si ta tendance marée
  // dominante existe, on la cite. Sinon on reste sur l'heure seule.
  const tideDom = dominantFor(tendencies, 'tide')
  const tideClause = tideDom?.label ? ` ${tideDom.label}` : ''

  const range = windowTimeRange(window.startTimeISO, window.endTimeISO)

  // « Tes prises tombent souvent le matin en marée descendante — créneau favorable
  //   vers 7h-9h aujourd'hui près de chez toi. » DESCRIPTIF, borné à 140.
  const text =
    `Tes prises tombent souvent ${hourDom.label}${tideClause} — créneau favorable ${range} aujourd'hui près de chez toi.`
      .slice(0, 140)

  return { shouldNotify: true, previewText: text }
}

// Réexport util pour le typage des libellés marée si un appelant veut composer
// sa propre copie (évite de réimporter config ailleurs).
export { TIDE_LABELS }
