export type WindBucket = 'calm' | 'light' | 'moderate' | 'strong' | 'gale'
// calm: 0-5 km/h · light: 5-15 · moderate: 15-25 · strong: 25-40 · gale: >40

export type TideStateBucket = 'rising' | 'falling' | 'slack' | 'unknown'

export type HourBucket = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk'
// night: 23-4 · dawn: 4-7 · morning: 7-11 · midday: 11-14 · afternoon: 14-18 · dusk: 18-23

export type SeasonBucket = 'spring' | 'summer' | 'autumn' | 'winter'

export type CatchSample = {
  caughtAt: Date
  lengthCm: number | null
  windSpeedKmh: number | null
  windDirectionDeg: number | null
  tideState: TideStateBucket
  hourLocal: number   // 0-23 en timezone Europe/Paris
  monthLocal: number  // 1-12
}

export type ConditionStats = {
  count: number
  avgLength: number | null
  catchRate: number
}

export type PersonalInsight = {
  factor: 'wind' | 'tide' | 'hour' | 'season'
  label: string
  description: string
  catchRate: number   // 0-1
  sampleCount: number
  isPositive: boolean
  confidence: 'low' | 'medium' | 'high'
}

export type PersonalMultiplier = {
  wind: number          // 0.5-2.0 (1.0 = neutre)
  tide: number          // 0.5-2.0
  solunar: number       // 0.5-2.0
  computedAt: string    // ISO
  basedOnCatches: number
}

export type PersonalProfile = {
  userId: string
  insights: PersonalInsight[]
  multiplier: PersonalMultiplier
  hasEnoughData: boolean
}
