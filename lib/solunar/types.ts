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
