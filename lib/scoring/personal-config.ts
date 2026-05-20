export const PERSONAL_SCORING_CONFIG = {
  MIN_CATCHES_FOR_INSIGHTS: 3,
  MIN_CATCHES_FOR_MULTIPLIER: 5,
  CACHE_TTL_HOURS: 24,

  MULTIPLIER_MIN: 0.6,
  MULTIPLIER_MAX: 1.6,
  MULTIPLIER_NEUTRAL: 1.0,

  CATCH_RATE_POSITIVE_THRESHOLD: 0.6,

  WIND_BUCKETS: {
    calm:     { label: 'Calme (< 5 km/h)',     range: [0, 5] as [number, number] },
    light:    { label: 'Léger (5-15 km/h)',    range: [5, 15] as [number, number] },
    moderate: { label: 'Modéré (15-25 km/h)',  range: [15, 25] as [number, number] },
    strong:   { label: 'Fort (25-40 km/h)',    range: [25, 40] as [number, number] },
    gale:     { label: 'Tempête (> 40 km/h)',  range: [40, 999] as [number, number] },
  },

  TIDE_LABELS: {
    rising:  'Marée montante',
    falling: 'Marée descendante',
    slack:   'Marée étale',
    unknown: 'Marée inconnue',
  },

  HOUR_LABELS: {
    night:     "La nuit",
    dawn:      "À l'aube",
    morning:   "Le matin",
    midday:    "En milieu de journée",
    afternoon: "L'après-midi",
    dusk:      "Au crépuscule",
  },

  SEASON_LABELS: {
    spring: "Au printemps",
    summer: "En été",
    autumn: "En automne",
    winter: "En hiver",
  },
} as const
