'use server'

import { unstable_cache } from 'next/cache'
import { fetchSpotForecastWeek } from '@/lib/conditions/spot-forecast'
import { computeWeeklyForecast } from '@/lib/solunar/index'
import { getNextBestWindow } from '@/lib/solunar/next-window'
import type { FishingWindow } from '@/lib/solunar/types'

async function _compute(lat: number, lng: number): Promise<FishingWindow | null> {
  const forecastWeek = await fetchSpotForecastWeek(lat, lng)
  if (!forecastWeek.length) return null
  const weekly = await computeWeeklyForecast(new Date(), lat, lng, forecastWeek)
  return getNextBestWindow(weekly)
}

export async function getSpotNextWindow(
  spotId: string,
  lat: number,
  lng: number,
): Promise<FishingWindow | null> {
  const hourKey = Math.floor(Date.now() / 3_600_000).toString()
  const cached = unstable_cache(
    () => _compute(lat, lng),
    ['spot-next-window', spotId, hourKey],
    { revalidate: 3600 },
  )
  return cached()
}
