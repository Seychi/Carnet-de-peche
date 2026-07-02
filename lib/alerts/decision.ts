// ─── Décision d'envoi d'une alerte par port (sprint 72) ────────────────────────
// PUR (aucune I/O) : toutes les données arrivent en paramètres, la fonction encode
// les règles verrouillées du brief. Le cron (workstream C2) fournit tier, réglages,
// tendances, score de fenêtre et journal de dédup ; ici on ne fait que trancher.
//
// Règles encodées (ordre des checks = ordre de refus, documenté et testé) :
//  1. Tier : Local / Itinérant UNIQUEMENT (Découverte = jamais, même opté-in).
//  2. Opt-in explicite : alerts_enabled défaut false.
//  3. Dédup : une ligne alerts_sent (user, spot, window_date) → refus.
//  4. Fenêtre du LENDEMAIN uniquement (jour civil de Paris).
//  5. Quiet hours : aucun envoi entre 21:00 et 06:59 Europe/Paris.
//  6. Mode :
//     - historique suffisant → PERSO, si score de fenêtre >= seuil utilisateur ;
//     - cold start → GÉNÉRIQUE, UNIQUEMENT sur signal grande marée qualifiant
//       (vrai coef >= 90 si un jour disponible, sinon marnage MESURÉ > seuil de
//       façade, pattern S49). Sinon : rien. Jamais de pourcentage inventé.

import {
  parisDateKey,
  parisMinutesOfDay,
  tomorrowParisDateKey,
} from './paris'
import type {
  AlertDecision,
  AlertDecisionInput,
  GenericTideSignal,
  SpotAlertPayload,
} from './types'

// ─── Constantes (exportées pour les tests et l'UI) ─────────────────────────────

/** Seuil par défaut du score de fenêtre (aligné migration 106 : alert_threshold 70). */
export const DEFAULT_ALERT_THRESHOLD = 70

/** Coefficient minimal pour une alerte générique quand un VRAI coef existe. */
export const GENERIC_COEF_MIN = 90

/** Quiet hours Europe/Paris : [21:00, 24:00) ∪ [00:00, 07:00). */
export const QUIET_HOURS_START_MIN = 21 * 60
export const QUIET_HOURS_END_MIN = 7 * 60

/** true si l'instant tombe dans la plage silencieuse (21h-7h, heure de Paris). */
export function isQuietHoursParis(d: Date): boolean {
  const m = parisMinutesOfDay(d)
  return m >= QUIET_HOURS_START_MIN || m < QUIET_HOURS_END_MIN
}

/** Seuil utilisateur borné à [0, 100] ; toute valeur invalide retombe sur le défaut. */
export function clampThreshold(threshold: number): number {
  if (!Number.isFinite(threshold)) return DEFAULT_ALERT_THRESHOLD
  return Math.min(100, Math.max(0, Math.round(threshold)))
}

/**
 * Un signal grande marée « qualifie » le mode générique si :
 * - vrai coefficient >= 90 (branche future SHOM, jamais un coef fabriqué), OU
 * - marnage MESURÉ strictement supérieur au seuil de façade (aligné S49
 *   getBigTideForDay : range <= threshold → pas une grande marée).
 */
export function genericSignalQualifies(signal: GenericTideSignal | null | undefined): boolean {
  if (!signal) return false
  if (signal.type === 'coefficient') {
    return Number.isFinite(signal.coefficient) && signal.coefficient >= GENERIC_COEF_MIN
  }
  return (
    Number.isFinite(signal.rangeM) &&
    Number.isFinite(signal.thresholdM) &&
    signal.rangeM > signal.thresholdM
  )
}

// ─── La décision ────────────────────────────────────────────────────────────────

export function shouldSendAlert(input: AlertDecisionInput): AlertDecision {
  const refuse = (reason: Extract<AlertDecision, { send: false }>['reason']): AlertDecision => ({
    send: false,
    kind: null,
    channels: null,
    reason,
  })

  // 1. Tier : la proactivité est le bénéfice payant (CLAUDE.md §8).
  if (input.tier !== 'local' && input.tier !== 'itinerant') return refuse('tier_not_eligible')

  // 2. Opt-in explicite (RGPD, anti-spam) : défaut OFF.
  if (!input.settings.alertsEnabled) return refuse('opt_in_off')

  // 3. Dédup (user, spot, window_date) : le journal alerts_sent fait foi.
  if (input.alreadySent) return refuse('already_sent')

  // 4. Fenêtre du LENDEMAIN uniquement (jour civil de Paris). Ni aujourd'hui
  //    (c'est le rôle de la notif optimal_window S26), ni après-demain.
  if (input.windowDate !== tomorrowParisDateKey(input.sendAt)) return refuse('window_not_tomorrow')

  // 5. Quiet hours : pas d'envoi 21h-7h Europe/Paris.
  if (isQuietHoursParis(input.sendAt)) return refuse('quiet_hours')

  // 6. Mode perso vs générique. Un compte riche ne retombe JAMAIS en générique :
  //    sous le seuil, on se tait (la grande marée « tous publics » reste couverte
  //    par le greffon big_tide S49, hors périmètre alertes).
  const channels = {
    inApp: true as const,
    push: input.settings.channelPush,
    email: input.settings.channelEmail,
  }

  if (input.trends.hasEnough) {
    if (input.windowScore < clampThreshold(input.settings.threshold)) {
      return refuse('below_threshold')
    }
    return { send: true, kind: 'perso', channels, reason: 'ok' }
  }

  if (!genericSignalQualifies(input.genericTideSignal)) {
    return refuse('cold_start_without_big_tide')
  }
  return { send: true, kind: 'generique', channels, reason: 'ok' }
}

// ─── Budget « 1 alerte / user / jour » ─────────────────────────────────────────
// Le cron tourne 1×/jour mais un utilisateur peut avoir jusqu'à 10 favoris : le
// brief impose max 1 push + 1 email / user / jour. C2 doit donc retenir UN SEUL
// candidat par utilisateur et par run. Règle : perso avant générique (le moat
// d'abord), puis meilleur score, puis premier arrivé (ordre stable).

export function pickBestAlertCandidate<
  T extends Pick<SpotAlertPayload, 'score' | 'kind'>,
>(candidates: T[]): T | null {
  let best: T | null = null
  for (const c of candidates) {
    if (best === null) {
      best = c
      continue
    }
    if (c.kind === 'perso' && best.kind === 'generique') {
      best = c
      continue
    }
    if (c.kind === best.kind && c.score > best.score) best = c
  }
  return best
}

// Réexport pratique pour C2 (calcul du jour cible sans réimporter ./paris).
export { parisDateKey, tomorrowParisDateKey }
