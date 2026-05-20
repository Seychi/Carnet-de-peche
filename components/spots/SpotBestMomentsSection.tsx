'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import type { DailyForecast } from '@/lib/solunar/types'
import { WeeklyCalendar } from '@/components/solunar/WeeklyCalendar'
import { DayBestMoments } from '@/components/solunar/DayBestMoments'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type SpotBestMomentsSectionProps = {
  weekly: DailyForecast[]
  spotName: string
  weatherCodes?: Record<string, number>
}

export function SpotBestMomentsSection({
  weekly,
  spotName,
  weatherCodes,
}: SpotBestMomentsSectionProps) {
  const [selectedDate, setSelectedDate] = useState(weekly[0]?.date ?? '')
  const selectedDaily = weekly.find(d => d.date === selectedDate) ?? weekly[0]

  if (!selectedDaily) return null

  return (
    <section className="bg-white rounded-[18px] border border-ink-100 p-5 md:p-7 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-navy-900 text-xl">
          Meilleurs moments à {spotName}
        </h2>
        <HowItWorksDialog />
      </div>

      {/* Calendrier 7 jours */}
      <WeeklyCalendar
        weekly={weekly}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        weatherCodes={weatherCodes}
      />

      {/* Détail du jour sélectionné */}
      <DayBestMoments daily={selectedDaily} showMoonInfo />
    </section>
  )
}

// ─── Tooltip "Comment c'est calculé ?" ───────────────────────────────────────

function HowItWorksDialog() {
  return (
    <Dialog>
      <DialogTrigger
        className="flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-teal-600 transition-colors shrink-0 bg-transparent border-0 cursor-pointer p-0"
        aria-label="Comment le score est calculé"
      >
        <Info size={14} />
        <span className="hidden sm:inline">Comment c&apos;est calculé ?</span>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Comment le score est calculé</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 text-[14px] text-ink-700 leading-relaxed">
          <p>Le score combine trois facteurs :</p>
          <ul className="flex flex-col gap-2">
            <li className="flex items-start gap-2">
              <span className="font-bold text-navy-900 shrink-0">40%</span>
              <span>
                <strong>Astronomique</strong> — lever et coucher de lune et de soleil, transits lunaires.
                Les moments autour du lever/coucher de lune sont historiquement les plus actifs pour les poissons.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-navy-900 shrink-0">35%</span>
              <span>
                <strong>Marée</strong> — montante &gt; descendante &gt; étale, coefficient.
                La marée montante concentre les poissons et favorise l&apos;alimentation.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-navy-900 shrink-0">25%</span>
              <span>
                <strong>Vent</strong> — idéal entre 5 et 15 km/h. Trop calme ou trop fort dégrade
                la qualité de pêche.
              </span>
            </li>
          </ul>
          <p className="text-[12px] text-ink-400 border-t border-ink-100 pt-3 mt-1">
            Ce scoring est générique (identique pour tous les pêcheurs).
            Le scoring personnalisé basé sur <strong>tes prises historiques</strong> arrivera prochainement.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
