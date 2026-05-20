'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import type { DailyForecast } from '@/lib/solunar/types'
import type { PersonalInsight } from '@/lib/scoring/types'
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
  insights?: PersonalInsight[]
}

export function SpotBestMomentsSection({
  weekly,
  spotName,
  weatherCodes,
  insights,
}: SpotBestMomentsSectionProps) {
  const [selectedDate, setSelectedDate] = useState(weekly[0]?.date ?? '')
  const selectedDaily = weekly.find(d => d.date === selectedDate) ?? weekly[0]

  if (!selectedDaily) return null

  const isPersonalized = weekly.some(d =>
    d.windows.some(w => w.factors.reasons.some(r => r.includes('Personnalisé')))
  )

  return (
    <section className="bg-white rounded-[18px] border border-ink-100 p-5 md:p-7 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="font-display text-navy-900 text-xl">
            Meilleurs moments à {spotName}
          </h2>
          {isPersonalized && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 border border-teal-500/20">
              ⚡ Perso
            </span>
          )}
        </div>
        <HowItWorksDialog isPersonalized={isPersonalized} />
      </div>

      {/* Calendrier 7 jours */}
      <WeeklyCalendar
        weekly={weekly}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        weatherCodes={weatherCodes}
      />

      {/* Détail du jour sélectionné */}
      <DayBestMoments daily={selectedDaily} showMoonInfo insights={insights} />
    </section>
  )
}

// ─── Tooltip "Comment c'est calculé ?" ───────────────────────────────────────

function HowItWorksDialog({ isPersonalized }: { isPersonalized: boolean }) {
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
          {isPersonalized ? (
            <p className="text-[12px] text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2.5">
              ⚡ Ce score est <strong>personnalisé</strong> d&apos;après ton historique de prises.
              Les conditions où tu pêches le mieux boostent le score.
            </p>
          ) : (
            <p className="text-[12px] text-ink-400 border-t border-ink-100 pt-3 mt-1">
              Ce scoring est générique (identique pour tous les pêcheurs).
              Logue tes prises pour obtenir un score personnalisé basé sur
              <strong> tes</strong> patterns de pêche.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
