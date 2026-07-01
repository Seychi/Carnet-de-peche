import { Flame, CalendarDays, Shield, Check } from 'lucide-react'
import type { Streak } from '@/lib/gamification/streaks'

// Série hebdomadaire ACTIVE mais tasteful (Sprint 62) : série en cours + urgence DOUCE
// (jours restants pour la garder) + joker mensuel visible. Jamais de culpabilisation
// (« tu vas tout perdre »). Cadence hebdomadaire (la pêche n'est pas quotidienne).
// DALTONIEN-SAFE : chaque état est porté par une ICÔNE distincte + du TEXTE + un CHIFFRE
// mono, jamais par la teinte seule (la couleur reste décorative).

export function StreakCard({ streak, className }: { streak: Streak; className?: string }) {
  const {
    currentWeekStreak,
    longestWeekStreak,
    weekActiveNow,
    daysLeftThisWeek,
    jokerAvailable,
    activeWeeks,
  } = streak

  const hasHistory = activeWeeks > 0 || longestWeekStreak > 0
  const onStreak = currentWeekStreak > 0

  // Aucune activité encore → invitation douce, sans pression.
  if (!hasHistory) {
    return (
      <div
        className={`flex items-center gap-3 rounded-[14px] border border-sand-200 bg-white px-4 py-3 ${className ?? ''}`}
      >
        <Flame size={18} className="shrink-0 text-ink-400" aria-hidden />
        <p className="text-[13px] text-ink-600">
          Ta série démarre à ta première semaine de pêche. Une prise ou une sortie suffit.
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-[14px] border border-sand-200 bg-white px-4 py-3 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-ink-400">
          <Flame size={14} className={onStreak ? 'text-coral-500' : 'text-ink-400'} aria-hidden />
          Ta série
        </div>
        {longestWeekStreak > 0 && (
          <span className="font-mono text-[11px] text-ink-400 tabular-nums">
            record {longestWeekStreak} sem.
          </span>
        )}
      </div>

      {/* Série en cours : chiffre mono + libellé */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-mono text-[28px] font-bold leading-none text-navy-900 tabular-nums">
          {currentWeekStreak}
        </span>
        <span className="text-[14px] text-ink-600">
          semaine{currentWeekStreak > 1 ? 's' : ''}
          {onStreak ? ' d’affilée' : ''}
        </span>
      </div>

      {/* Ligne d'état : validée / urgence douce / à relancer — jamais culpabilisant */}
      <p className="mt-1.5 flex items-center gap-1.5 text-[12px] leading-snug text-ink-600">
        {onStreak && weekActiveNow ? (
          <>
            <Check size={13} className="shrink-0 text-teal-600" aria-hidden />
            Semaine validée. Beau rythme.
          </>
        ) : onStreak ? (
          <>
            <Flame size={13} className="shrink-0 text-coral-500" aria-hidden />
            {daysLeftThisWeek > 1
              ? `Plus que ${daysLeftThisWeek} jours pour la garder cette semaine.`
              : 'Dernier jour pour la garder cette semaine.'}
          </>
        ) : (
          <>
            <CalendarDays size={13} className="shrink-0 text-ink-400" aria-hidden />
            Série à relancer. Une prise ou une sortie et c’est reparti.
          </>
        )}
      </p>

      {/* Joker mensuel visible : ce qui rend la série tasteful (anti-culpabilisation) */}
      {onStreak && !weekActiveNow && (
        <p className="mt-1 flex items-center gap-1.5 text-[11.5px] leading-snug text-ink-500">
          <Shield size={12} className="shrink-0 text-ink-400" aria-hidden />
          {jokerAvailable
            ? 'Un joker dispo ce mois : une semaine sautée ne casse pas ta série.'
            : 'Joker du mois déjà pris. La semaine prochaine repart proprement.'}
        </p>
      )}
    </div>
  )
}
