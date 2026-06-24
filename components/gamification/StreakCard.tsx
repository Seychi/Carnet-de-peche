import { CalendarDays } from 'lucide-react'
import type { Streak } from '@/lib/gamification/streaks'

// Régularité PERSONNELLE — descriptif, jamais de pression (« pêche demain ! ») ni
// de comparaison. Juste un miroir honnête de tes sorties. Privé.

export function StreakCard({ streak, className }: { streak: Streak; className?: string }) {
  const empty = streak.activeDays === 0

  if (empty) {
    return (
      <div
        className={`flex items-center gap-3 rounded-[14px] border border-sand-200 bg-white px-4 py-3 ${className ?? ''}`}
      >
        <CalendarDays size={18} className="shrink-0 text-ink-400" aria-hidden />
        <p className="text-[13px] text-ink-600">
          Ta régularité apparaîtra ici dès ta première prise loguée.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-[14px] border border-sand-200 bg-white px-4 py-3 ${className ?? ''}`}>
      <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-ink-400">
        <CalendarDays size={14} className="text-teal-600" aria-hidden /> Ta régularité
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat value={String(streak.activeDays)} label={streak.activeDays > 1 ? 'jours actifs' : 'jour actif'} />
        <Stat value={String(streak.activeWeeks)} label={streak.activeWeeks > 1 ? 'semaines' : 'semaine'} />
        <Stat
          value={String(streak.longestWeekStreak)}
          label="série max"
          hint="semaines d’affilée"
        />
      </div>
      <p className="mt-2 text-[11.5px] leading-snug text-ink-500">
        Juste un repère, pas une obligation. Pêche quand ça te chante.
      </p>
    </div>
  )
}

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-[10px] bg-slate-50 px-3 py-2 text-center">
      <p className="font-mono text-[18px] font-bold leading-none text-navy-900 tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
      {hint && <p className="mt-0.5 text-[9px] text-ink-300">{hint}</p>}
    </div>
  )
}
