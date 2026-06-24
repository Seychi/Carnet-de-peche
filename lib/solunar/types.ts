export type SolunarEventType =
  | 'sunrise' | 'sunset'
  | 'moonrise' | 'moonset'
  | 'moon_apex' | 'moon_nadir'

export type SolunarEvent = {
  type: SolunarEventType
  timeISO: string
  localTime: string
  moonPhase?: number
  moonIllumination?: number
}

export type QualityLevel = 'faible' | 'moyenne' | 'bonne' | 'tres_bonne' | 'exceptionnelle'

export type ScoringFactors = {
  solunar: number
  tide: number
  wind: number
  reasons: string[]
  /**
   * Poids RÉELLEMENT appliqués (somme = 1). Reflète la renormalisation marée :
   * en faible marnage (Med), le poids marée (0.35) est réparti sur astro + vent
   * → tide=0 ici. L'affichage doit lire CES poids, pas les poids fixes du barème.
   */
  weights: { solunar: number; tide: number; wind: number }
  /** Marnage journalier MESURÉ (m). null = pas de données de marée. Jamais inventé. */
  marnageM: number | null
  /** true si la marée a été neutralisée (marnage < seuil) → « marée plate, peu déterminante ». */
  tideNonDiscriminating: boolean
}

export type FishingWindow = {
  startTimeISO: string
  endTimeISO: string
  startLocal: string
  endLocal: string
  centerEvent: SolunarEvent
  score: number
  quality: QualityLevel
  factors: ScoringFactors
}

export type DailyForecast = {
  date: string
  windows: FishingWindow[]
  dayScore: number
  dayQuality: QualityLevel
  sunrise: string
  sunset: string
  moonPhaseLabel: string
  moonIllumination: number
}
