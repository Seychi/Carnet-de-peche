import type { Confidence } from './types'

// Seuils du moteur perso. Sous MIN_FOR_TENDENCIES, on n'affiche pas de tendances
// (état dégradé/vide honnête). Un facteur a besoin d'au moins MIN_PER_FACTOR prises
// renseignées pour compter (sinon « le matin » sur 1 prise serait du bruit).
export const PERSONAL_CONFIG = {
  MIN_FOR_TENDENCIES: 3,
  MIN_PER_FACTOR: 2,
} as const

// Barème de confiance UNIQUE (repris du système A, le seul à l'exposer) :
// < 5 → faible, 5-20 → moyenne, > 20 → élevée.
export function confidence(count: number): Confidence {
  if (count < 5) return 'low'
  if (count <= 20) return 'medium'
  return 'high'
}

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: 'confiance faible',
  medium: 'confiance moyenne',
  high: 'confiance élevée',
}

// Libellés prêts à embarquer dans « X % de tes prises … {label} ».
export const WIND_LABELS = {
  calm: 'par vent calme',
  light: 'par vent léger',
  moderate: 'par vent modéré',
  strong: 'par vent fort',
  gale: 'par tempête',
} as const

export const HOUR_LABELS = {
  night: 'la nuit',
  dawn: "à l'aube",
  morning: 'le matin',
  midday: 'en milieu de journée',
  afternoon: "l'après-midi",
  dusk: 'au crépuscule',
} as const

export const SEASON_LABELS = {
  spring: 'au printemps',
  summer: 'en été',
  autumn: 'en automne',
  winter: 'en hiver',
} as const

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'le dimanche',
  1: 'le lundi',
  2: 'le mardi',
  3: 'le mercredi',
  4: 'le jeudi',
  5: 'le vendredi',
  6: 'le samedi',
}

export const TIDE_LABELS = {
  rising: 'en marée montante',
  falling: 'en marée descendante',
  slack: "à l'étale",
} as const

// Libellé court du facteur (en-tête de ligne dans l'UI).
export const FACTOR_LABELS: Record<string, string> = {
  hour: 'Créneau',
  weekday: 'Jour',
  season: 'Saison',
  wind: 'Vent',
  tide: 'Marée',
  gear: 'Leurre',
}
