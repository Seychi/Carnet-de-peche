import { Anchor } from 'lucide-react'
import { cn } from '@/lib/utils'
import { levelFromXp } from '@/lib/gamification/levels'

// Puce de rang (Sprint 60) — icône ancre + nom du rang + niveau. Le NIVEAU passe en
// JetBrains Mono (règle DA « tout chiffre métier en mono »). L'info n'est jamais portée
// par la seule teinte (John est daltonien) : le rang est nommé en toutes lettres.
// Lecture seule : ce composant n'écrit jamais l'XP.

export function RankChip({
  totalXp,
  onDark = false,
  className,
}: {
  totalXp: number
  onDark?: boolean
  className?: string
}) {
  const { rankName, level } = levelFromXp(totalXp)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        onDark
          ? 'border-white/15 bg-white/[0.07] text-white'
          : 'border-sand-200 bg-white text-navy-900',
        className,
      )}
    >
      <Anchor
        size={13}
        className={cn('shrink-0', onDark ? 'text-gold-500' : 'text-gold-700')}
        aria-hidden
      />
      <span className="text-[12px] font-semibold leading-none">{rankName}</span>
      <span
        className={cn(
          // ink-500 sur clair = AA (5.24:1) ; ink-400 échouait (3.46:1) pour ce libellé signifiant.
          'font-mono text-[10px] font-medium leading-none tabular-nums',
          onDark ? 'text-white/55' : 'text-ink-500',
        )}
      >
        Lv.{level}
      </span>
    </span>
  )
}
