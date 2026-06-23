// Moteur perso descriptif unifié (sprint 22, Chantier A). Remplace les 2 systèmes
// divergents lib/scoring/{insights,patterns,catch-analysis,personal-fetcher} +
// lib/catches/insights. Descriptif, jamais prédictif. Aucun chiffre 0-100 perso.
export type {
  TendencyFactor,
  Confidence,
  CatchSample,
  Tendency,
  TendencyScope,
  PersonalTendencies,
} from './types'

export { computeTendencies, computePersonalTendencies } from './tendencies'
export { getPersonalTendencies } from './fetch'
export { toCatchSamples, bucketizeWind, bucketizeHour, bucketizeSeason } from './buckets'
export type { DbCatchRow } from './buckets'
export {
  confidence,
  PERSONAL_CONFIG,
  CONFIDENCE_LABELS,
  FACTOR_LABELS,
  WIND_LABELS,
  HOUR_LABELS,
  SEASON_LABELS,
  WEEKDAY_LABELS,
  TIDE_LABELS,
} from './config'
