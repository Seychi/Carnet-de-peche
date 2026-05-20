'use client'

import { useState } from 'react'
import type { DailyForecast } from '@/lib/solunar/types'
import { WeeklyCalendar } from '@/components/solunar/WeeklyCalendar'
import { DayBestMoments } from '@/components/solunar/DayBestMoments'

type Props = {
  weekly: DailyForecast[]
  weatherCodes: Record<string, number>
}

export function SolunarPreviewClient({ weekly, weatherCodes }: Props) {
  const [selectedDate, setSelectedDate] = useState(weekly[0]?.date ?? '')
  const selectedDaily = weekly.find(d => d.date === selectedDate) ?? weekly[0]

  return (
    <div className="flex flex-col gap-8">
      {/* Section 1 : WeeklyCalendar */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">
          WeeklyCalendar
        </h2>
        <WeeklyCalendar
          weekly={weekly}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          weatherCodes={weatherCodes}
        />
      </section>

      {/* Section 2 : DayBestMoments du jour sélectionné */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">
          DayBestMoments — {selectedDate}
        </h2>
        {selectedDaily && (
          <DayBestMoments daily={selectedDaily} showMoonInfo />
        )}
      </section>

      {/* Section 3 : Empty state forcé */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-ink-400">
          DayBestMoments — empty state
        </h2>
        <DayBestMoments
          daily={{
            ...weekly[0],
            windows: [],
            dayScore: 0,
            dayQuality: 'faible',
          }}
          showMoonInfo={false}
        />
      </section>
    </div>
  )
}
