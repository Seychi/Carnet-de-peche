export const SOLUNAR_CONFIG = {
  WINDOW_DURATION_HOURS: 2,
  MAX_WINDOWS_PER_DAY: 6,
  OVERLAP_DEDUP_THRESHOLD: 0.5,
  EARLIEST_HOUR: 4,
  LATEST_HOUR: 23,

  WEIGHTS: {
    solunar: 0.40,
    tide: 0.35,
    wind: 0.25,
  },

  // Recalibré sprint 10.6 (WS E) : le scoring saturait (6 jours sur 7 « Exceptionnelle »).
  // « Exceptionnelle » (≥ 95) exige désormais la conjonction de TOUS les facteurs :
  // événement lunaire majeur EN nouvelle/pleine lune + marée montante avec PM/BM
  // dans la fenêtre + vent ≤ ~17 km/h.
  QUALITY_THRESHOLDS: {
    faible: 0,
    moyenne: 40,
    bonne: 60,
    tres_bonne: 80,
    exceptionnelle: 95,
  },

  // Poids de base par événement. Aucun ne vaut 1.0 seul : la composante max
  // n'est atteignable qu'avec le bonus de phase lunaire (cumul plafonné à
  // MAX_SOLUNAR_SCORE — les bonus lune ne saturent plus le score à eux seuls).
  SOLUNAR_WEIGHTS: {
    moon_apex: 0.85,
    moon_nadir: 0.85,
    moonrise: 0.7,
    moonset: 0.7,
    sunrise: 0.55,
    sunset: 0.55,
  },

  // Bonus multiplicatif nouvelle/pleine lune + plafond du cumul des bonus solunaires.
  MOON_PHASE_BONUS: 1.2,
  MAX_SOLUNAR_SCORE: 1.0,

  TIDE: {
    RISING_SCORE: 0.8, // montante seule
    FALLING_SCORE: 0.6, // descendante seule
    SLACK_SCORE: 0.0, // étale plate
    EXTREMUM_BONUS: 0.2, // PM/BM dans la fenêtre (cumul plafonné à 1.0)
    NO_DATA_SCORE: 0.35, // marée inconnue : plafonnée sous le neutre (avant : 0.5)
  },

  WIND: {
    CALM_MAX_KMH: 5,
    CALM_SCORE: 0.9,
    IDEAL_MAX_KMH: 15,
    ACCEPTABLE_MAX_KMH: 25,
    ACCEPTABLE_MIN_SCORE: 0.5,
    STRONG_MAX_KMH: 40, // au-delà : composante à 0 (plus de plancher 0.2)
    UNKNOWN_SCORE: 0.7,
  },
} as const
