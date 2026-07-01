import { cn } from '@/lib/utils'
import { levelFromXp } from '@/lib/gamification/levels'
import { RankChip } from './RankChip'
import { XpBar } from './XpBar'

// Bloc de progression = rang + barre XP (Sprint 60). Présentation pure, réutilisée à
// l'identique sur le profil public (hero navy, onDark) et le cockpit home (carte claire).
// Lecture seule : la logique de seuils vient de levels.ts (source unique), jamais dupliquée.

export function RankProgress({
  totalXp,
  onDark = false,
  className,
}: {
  totalXp: number
  onDark?: boolean
  className?: string
}) {
  const info = levelFromXp(totalXp)
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <RankChip totalXp={totalXp} onDark={onDark} className="self-start" />
      <XpBar
        xpIntoLevel={info.xpIntoLevel}
        xpForNextLevel={info.xpForNextLevel}
        onDark={onDark}
      />
    </div>
  )
}
