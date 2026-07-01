import { Fish, Ruler, Sunrise, Compass, Trophy, Target } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ChallengeBoardItem } from '@/lib/gamification/challenges-solo'
import { ChallengeRing } from './ChallengeRing'

// Carte d'un défi solo (Sprint 63) : anneau de progression + titre + description + XP.
// Descriptive et positive, jamais de comparaison inter-pêcheurs (Phase E). Server Component
// (l'anneau animé est le seul îlot client).

const ICONS: Record<string, LucideIcon> = {
  fish: Fish,
  ruler: Ruler,
  sunrise: Sunrise,
  compass: Compass,
  trophy: Trophy,
}

export function ChallengeCard({ item }: { item: ChallengeBoardItem }) {
  const Icon = (item.icon && ICONS[item.icon]) || Target

  return (
    <li
      className={`flex items-start gap-3 rounded-[12px] border p-3 ${
        item.completed ? 'border-teal-200 bg-teal-50/40' : 'border-sand-200 bg-white'
      }`}
    >
      <ChallengeRing
        value={item.progress}
        max={item.target}
        completed={item.completed}
        label={`${item.title} : ${Math.min(item.progress, item.target)} sur ${item.target}`}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[13.5px] font-semibold leading-tight text-navy-900">
            <Icon size={14} className="shrink-0 text-ink-400" aria-hidden="true" />
            {item.title}
          </p>
          {item.rewardXp > 0 && (
            <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-gold-600">
              +{item.rewardXp} XP
            </span>
          )}
        </div>

        <p className="mt-1 text-[11.5px] leading-snug text-ink-500">{item.description}</p>

        {item.completed && (
          <p className="mt-1 text-[11px] font-medium text-teal-700">Défi relevé.</p>
        )}
      </div>
    </li>
  )
}
