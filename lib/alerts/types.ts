// ─── Alertes par port (sprint 72) — types partagés ────────────────────────────
// Contrat commun entre les workstreams C1 (logique pure), C2 (branchement cron),
// D (UX réglages) et E (email Resend). AUCUNE I/O ici : tout est pur et testable.
//
// INVARIANTS (brief S72, non négociables) :
// - JAMAIS de coordonnée précise dans une alerte (nom + slug du spot uniquement).
// - Honnêteté des chiffres : tout nombre affiché vient d'une donnée mesurée ou du
//   carnet de l'utilisateur. Aucun coefficient de marée n'est inventé (le repo n'en
//   calcule aucun : tide_coefficient est toujours null, cf lib/conditions/openmeteo).
// - Timezone Europe/Paris pour toute logique calendrier/heure (cf lib/alerts/paris).

import type { Confidence } from '@/lib/scoring/personal/types'

// ─── Contrat inter-agents (EXACT, ne pas modifier sans synchroniser C2/D/E) ────

export type SpotAlertPayload = {
  userId: string
  spotId: string
  spotName: string
  spotSlug: string
  windowDate: string /* YYYY-MM-DD Paris */
  windowLabel: string /* ex. « demain 06:10 » */
  score: number /* 0-100 */
  kind: 'perso' | 'generique'
  justification: string /* phrase FR sans coordonnée */
}

// ─── Réglages d'alerte (migration 106, workstream B ; étendu migration 111) ───
// Mapping DB : alerts_enabled (default false), channel_push (default true),
// channel_email (default true), alert_threshold smallint (default 70),
// big_tide_alert_enabled (default false, sprint 77).

export type AlertSettings = {
  alertsEnabled: boolean
  channelPush: boolean
  channelEmail: boolean
  /** Score de fenêtre minimal (0-100) pour déclencher une alerte perso. */
  threshold: number
  /**
   * Opt-in DISTINCT (sprint 77) à l'alerte grande marée sur les spots favoris.
   * Indépendant de `alertsEnabled` : l'alerte perso est payante (Local/Itinérant),
   * celle-ci est ouverte à tous les tiers car elle ne repose que sur une mesure.
   */
  bigTideAlertEnabled: boolean
}

// ─── Résumé des tendances perso (dérivé de PersonalTendencies, S22) ────────────

export type PersonalTrendSummary = {
  /** true = assez de prises pour des tendances (seuil S22 : >= 3). */
  hasEnough: boolean
  sampleCount: number
  confidence: Confidence
}

// ─── Signal « grande marée » pour le mode générique (cold start) ───────────────
// Deux formes HONNÊTES, jamais de coef inventé :
// - 'coefficient' : un VRAI coefficient (SHOM futur). Aujourd'hui indisponible
//   partout dans le repo (tide_coefficient toujours null) → cette branche existe
//   pour le jour où la donnée réelle arrive, pas pour fabriquer un chiffre.
// - 'marnage'     : amplitude MESURÉE du jour (m) + seuil de façade (pattern S49
//   getBigTideForDay : Manche > 9 m, Atlantique > 5 m, Méditerranée jamais).

export type GenericTideSignal =
  | { type: 'coefficient'; coefficient: number }
  | { type: 'marnage'; rangeM: number; thresholdM: number }

// ─── Décision d'envoi ──────────────────────────────────────────────────────────

export type AlertTier = 'anonymous' | 'discovery' | 'local' | 'itinerant'

export type AlertChannels = {
  /** L'in-app est toujours servi quand on envoie (canal de base, non désactivable v1). */
  inApp: true
  push: boolean
  email: boolean
}

export type AlertRefusalReason =
  | 'tier_not_eligible' // Découverte / anonyme : jamais d'alerte, même opté-in
  | 'opt_in_off' // alerts_enabled = false (défaut)
  | 'already_sent' // ligne alerts_sent (user, spot, window_date) présente
  | 'window_not_tomorrow' // on n'alerte QUE pour la fenêtre du lendemain (Paris)
  | 'quiet_hours' // envoi prévu entre 21h et 7h Europe/Paris
  | 'below_threshold' // mode perso : score de fenêtre < seuil utilisateur
  | 'cold_start_without_big_tide' // pas d'historique ET pas de grande marée qualifiante

export type AlertDecision =
  | { send: false; kind: null; channels: null; reason: AlertRefusalReason }
  | { send: true; kind: 'perso' | 'generique'; channels: AlertChannels; reason: 'ok' }

export type AlertDecisionInput = {
  /** Tier courant (RPC current_tier). 1 appel/user max côté cron, jamais de N+1. */
  tier: AlertTier | string
  settings: AlertSettings
  trends: PersonalTrendSummary
  /** Score 0-100 de la fenêtre candidate (décomposition existante, cf scoring.ts). */
  windowScore: number
  /** Jour (YYYY-MM-DD Paris) de la fenêtre candidate. */
  windowDate: string
  /** Instant d'envoi prévu (le « maintenant » du cron). */
  sendAt: Date
  /** true = une ligne alerts_sent (user, spot, window_date) existe déjà. */
  alreadySent: boolean
  /** Signal grande marée du LENDEMAIN (mode générique). null/absent = pas de signal. */
  genericTideSignal?: GenericTideSignal | null
}

// ─── Overlay perso sur la fenêtre (scoring.ts) ─────────────────────────────────

/** Direction de marée dérivée des hauteurs mesurées (même logique que scoreTide). */
export type TideDirection = 'rising' | 'falling' | 'slack'

/** Fenêtre du lendemain réduite aux signaux comparables aux tendances perso. */
export type AlertWindowSignal = {
  startTimeISO: string
  endTimeISO: string
  /** Score 0-100 générique de la fenêtre (FishingWindow.score, S6/S19). */
  score: number
  /** Direction de marée sur la fenêtre (cf tideDirectionForWindow). null = inconnue. */
  tideDirection?: TideDirection | null
  /** Vent (km/h) à l'heure de la fenêtre. null = inconnu. */
  windSpeedKmh?: number | null
}

/** Une tendance perso dont le bucket dominant coïncide avec la fenêtre candidate. */
export type MatchedTendency = {
  factor: 'hour' | 'tide' | 'wind'
  /** Libellé S22 du bucket dominant, ex. « le matin », « en marée descendante ». */
  label: string
  /** Prises dans le bucket dominant (numérateur RÉEL, jamais inventé). */
  count: number
  /** Prises renseignées pour ce facteur (dénominateur RÉEL). */
  sampleCount: number
  /** count / sampleCount (0-1). */
  share: number
}

export type WindowOverlay = {
  /** Score 0-100 de la fenêtre = score générique existant, INCHANGÉ (cf scoring.ts). */
  score: number
  kind: 'perso' | 'generique'
  /** Tendances perso qui coïncident avec la fenêtre (vide en mode générique). */
  matched: MatchedTendency[]
  trends: PersonalTrendSummary
}

// ─── Message (message.ts) ──────────────────────────────────────────────────────

/** Faits MESURÉS de la fenêtre, cités tels quels dans la justification. */
export type WindowFacts = {
  tideDirection?: TideDirection | null
  windSpeedKmh?: number | null
  /** Direction du vent déjà formatée par l'appelant, ex. « NO ». Jamais inventée ici. */
  windDirectionLabel?: string | null
  /** VRAI coefficient uniquement (SHOM futur). Aujourd'hui toujours indisponible. */
  tideCoefficient?: number | null
  /** Marnage mesuré du jour (m). */
  tideRangeM?: number | null
}

export type JustificationInput = {
  kind: 'perso' | 'generique'
  facts?: WindowFacts
  /** Tendances matchées (mode perso). La plus forte est citée avec ses vrais comptes. */
  matched?: MatchedTendency[]
}

export type AlertMessage = {
  title: string
  body: string
  emailSubject: string
}

// ─── Alerte GRANDE MARÉE sur spot favori (sprint 77, Bloc 10.2) ───────────────
//
// ⚠️ LE COEFFICIENT DE MARÉE N'EXISTE PAS DANS CE PROJET. Le brief parlait de
// « préviens-moi quand le coefficient dépasse 90 » ; le repo ne calcule aucun
// coefficient (Open-Meteo ne l'expose pas, `tide_coefficient` est toujours null,
// re-vérifié au S72). Fabriquer un coef à partir du marnage serait un chiffre
// inventé, interdit par les invariants du projet.
//
// Ce que déclenche RÉELLEMENT cette alerte : le MARNAGE MESURÉ du lendemain
// (max PM - min BM, dérivé de sea_level_height_msl) comparé au seuil de façade
// du sprint 49 (Manche > 9 m, Atlantique > 5 m, Méditerranée/Corse jamais). Le
// payload ne transporte donc que ces deux mètres, et la copie les nomme
// « marnage », jamais « coefficient ».
//
// Différences assumées avec l'alerte par port (S72) :
//   - PAS de gating de tier : c'est une mesure publique, pas le moat perso ;
//   - opt-in DÉDIÉ (`big_tide_alert_enabled`), jamais activé par `alerts_enabled` ;
//   - journal DÉDIÉ (`big_tide_alerts_sent`) : pas de score de fenêtre à écrire
//     dans `alerts_sent`, et /home ne doit pas rendre un ScoreRing sur du vide ;
//   - dédup d'ÉPISODE : une grande marée dure 3-4 jours, on alerte le PREMIER
//     jour et on se tait ensuite (« une seule fois par événement »).

export type BigTideAlertPayload = {
  userId: string
  spotId: string
  spotName: string
  spotSlug: string
  /** Jour Paris annoncé (YYYY-MM-DD), toujours le lendemain du calcul. */
  windowDate: string
  /** Marnage MESURÉ du jour annoncé, en mètres. Jamais un coefficient. */
  rangeM: number
  /** Seuil de grande marée de la façade du spot, en mètres (S49). */
  thresholdM: number
}

export type BigTideRefusalReason =
  | 'opt_in_off' // big_tide_alert_enabled = false (défaut)
  | 'already_sent' // ligne big_tide_alerts_sent (user, spot, demain)
  | 'episode_already_alerted' // déjà alerté pour AUJOURD'HUI : même épisode de vives-eaux
  | 'window_not_tomorrow' // on n'annonce que le lendemain (jour civil Paris)
  | 'quiet_hours' // envoi prévu entre 21h et 7h Europe/Paris
  | 'no_big_tide' // marnage sous le seuil, ou façade sans seuil (Méditerranée)

export type BigTideAlertDecision =
  | { send: false; channels: null; reason: BigTideRefusalReason }
  | { send: true; channels: AlertChannels; reason: 'ok' }

export type BigTideDecisionInput = {
  settings: AlertSettings
  /** Signal de marée MESURÉ du lendemain (cf genericTideSignalForDay). */
  signal: GenericTideSignal | null
  /** Jour de la marée annoncée (YYYY-MM-DD Paris). */
  windowDate: string
  /** Instant d'envoi prévu (le « maintenant » du cron). */
  sendAt: Date
  /** true = une ligne big_tide_alerts_sent (user, spot, windowDate) existe déjà. */
  alreadySent: boolean
  /** true = ce couple (user, spot) a déjà été alerté pour la VEILLE du jour annoncé. */
  episodeAlreadyAlerted: boolean
}
