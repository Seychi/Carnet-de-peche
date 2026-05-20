'use server'

import { unstable_cache } from 'next/cache'
import { fetchSpotForecastWeek } from '@/lib/conditions/spot-forecast'
import { computeWeeklyForecast } from '@/lib/solunar/index'
import { getNextBestWindow } from '@/lib/solunar/next-window'
import { getCachedPersonalProfile } from '@/lib/scoring/personal-fetcher'
import { PERSONAL_SCORING_CONFIG } from '@/lib/scoring/personal-config'
import type { FishingWindow } from '@/lib/solunar/types'
import type { PersonalMultiplier } from '@/lib/scoring/types'

async function _compute(
  lat: number,
  lng: number,
  personalMultiplier?: PersonalMultiplier
): Promise<FishingWindow | null> {
  const forecastWeek = await fetchSpotForecastWeek(lat, lng)
  if (!forecastWeek.length) return null
  const weekly = await computeWeeklyForecast(new Date(), lat, lng, forecastWeek, personalMultiplier)
  return getNextBestWindow(weekly)
}

export async function getSpotNextWindow(
  spotId: string,
  lat: number,
  lng: number,
  userId?: string,
): Promise<FishingWindow | null> {
  let personalMultiplier: PersonalMultiplier | undefined

  if (userId) {
    const profile = await getCachedPersonalProfile(userId)
    if (profile.multiplier.basedOnCatches >= PERSONAL_SCORING_CONFIG.MIN_CATCHES_FOR_MULTIPLIER) {
      personalMultiplier = profile.multiplier
    }
  }

  const hourKey = Math.floor(Date.now() / 3_600_000).toString()
  const userKey = userId ?? 'anon'
  const cached = unstable_cache(
    () => _compute(lat, lng, personalMultiplier),
    ['spot-next-window', spotId, hourKey, userKey],
    { revalidate: 3600 },
  )
  return cached()
}
