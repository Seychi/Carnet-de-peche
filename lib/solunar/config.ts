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

  QUALITY_THRESHOLDS: {
    faible: 0,
    moyenne: 40,
    bonne: 60,
    tres_bonne: 75,
    exceptionnelle: 90,
  },

  SOLUNAR_WEIGHTS: {
    moon_apex: 1.0,
    moon_nadir: 1.0,
    moonrise: 0.8,
    moonset: 0.8,
    sunrise: 0.6,
    sunset: 0.6,
  },

  TIDE: {
    RISING_BONUS: 0.4,
    FALLING_BONUS: 0.2,
    SLACK_BONUS: 0.0,
    COEF_THRESHOLD_GOOD: 70,
    COEF_THRESHOLD_EXCEPTIONAL: 95,
  },

  WIND: {
    IDEAL_KMH: 10,
    ACCEPTABLE_MAX_KMH: 25,
    DEGRADATION_PER_KMH_ABOVE_IDEAL: 0.05,
  },
} as const
