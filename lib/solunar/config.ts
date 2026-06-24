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
    // Sprint 24 (correctif Med) : sous ce marnage journalier (m), la marée est
    // physiquement non discriminante (Méditerranée ~0,15 m). On NE l'impose plus à
    // 0/35 : on retire son poids (0.35) et on le renormalise sur astro + vent.
    // L'Atlantique (marnage ~3 m) reste très au-dessus → marée pleinement comptée.
    NEUTRAL_MARNAGE_M: 0.3,
    // Seuil d'étale (delta de hauteur sur la fenêtre) désormais RELATIF au marnage
    // local, plafonné à 0.1 m (comportement Atlantique inchangé). Cf marees-med.md.
    SLACK_DELTA_MAX_M: 0.1,
    SLACK_DELTA_RATIO: 0.15,
  },

  // Recalibré sprint 19 : courbe CONTINUE à pic unique (avant : plateau plat à 1.0
  // sur toute la bande 5–15 km/h → composante figée à 25/25 dès que le vent y tombait,
  // ce qui est fréquent à midi sur le littoral). Désormais le vent DISCRIMINE :
  // pic à ~10 km/h, décroissance dès 10, plus aucun palier large.
  // D1 (décision John — défaut appliqué) : pas de pénalité FORTE du calme (mer d'huile
  // reste « correcte » à 0.85, pas pénalisée comme un coup de vent).
  WIND: {
    CALM_KMH: 3,            // ≤ 3 km/h : mer d'huile, léger retrait (CALM_SCORE), pas de pénalité forte
    CALM_SCORE: 0.85,
    IDEAL_KMH: 10,          // pic unique (montée 3→10, décroissance 10→25)
    ACCEPTABLE_MAX_KMH: 25, // à 25 km/h : composante tombée à ACCEPTABLE_MIN_SCORE
    ACCEPTABLE_MIN_SCORE: 0.45,
    STRONG_MAX_KMH: 40,     // au-delà : composante à 0 (pas de plancher)
    UNKNOWN_SCORE: 0.7,     // vent inconnu (null) : neutre
  },
} as const
