import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Trophy, Check } from 'lucide-react'
import type { ChallengeBoardItem } from '@/lib/gamification/challenges-solo'
import { TagData } from '@/components/ui-v2/tag-data'
import { ChallengeCard } from './ChallengeCard'

// Board des défis solo (Sprint 63) : l'événement saisonnier en tête (mis en avant), puis
// les défis courants avec anneau de progression. 100% descriptif/positif, aucune comparaison
// inter-pêcheurs (ça, c'est la Phase E). La célébration d'une complétion se joue AU LOG de la
// prise (CelebrationOverlay, cf CatchForm) ; ce board est une surface de LECTURE.

export function ChallengesBoard({
  items,
  className,
}: {
  items: ChallengeBoardItem[]
  className?: string
}) {
  if (!items.length) return null

  const seasonal = items.filter((i) => i.scope === 'seasonal')
  const regular = items.filter((i) => i.scope !== 'seasonal')

  return (
    <section className={`rounded-[14px] border border-sand-200 bg-white p-4 ${className ?? ''}`}>
      <header className="mb-3">
        <TagData>DÉFIS</TagData>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-500">
          Des objectifs courts pour progresser à ton rythme. Chaque défi relevé te donne de
          l’XP.
        </p>
      </header>

      {seasonal.length > 0 && (
        <div className="mb-3 space-y-2.5">
          {seasonal.map((item) => (
            <SeasonalEventCard key={item.slug} item={item} />
          ))}
        </div>
      )}

      <ul className="space-y-2.5">
        {regular.map((item) => (
          <ChallengeCard key={item.slug} item={item} />
        ))}
      </ul>
    </section>
  )
}

// Événement saisonnier mis en avant (fond navy, accent or). Solo : « ton plus gros »,
// jamais un classement. Daltonien-safe : « Relevé » porté par l'icône Check + le texte.
function SeasonalEventCard({ item }: { item: ChallengeBoardItem }) {
  const endLabel = item.periodEnd
    ? format(new Date(item.periodEnd), 'd MMM', { locale: fr })
    : null

  return (
    <div className="rounded-[12px] border border-gold-500/30 bg-navy-950 p-3.5 text-white">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-gold-400">
          <Trophy size={13} aria-hidden="true" /> Événement · {item.title}
        </span>
        {item.completed ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-500/15 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-teal-300">
            <Check size={12} aria-hidden="true" /> Relevé
          </span>
        ) : (
          item.rewardXp > 0 && (
            <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-gold-400">
              +{item.rewardXp} XP
            </span>
          )
        )}
      </div>

      <p className="mt-1.5 text-[13px] leading-snug text-white/80">{item.description}</p>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-white/55">
        {item.bestValue != null ? (
          <span>
            Ta meilleure prise : <span className="font-semibold text-teal-300">{item.bestValue} cm</span>
          </span>
        ) : (
          <span>Pas encore de prise cette saison.</span>
        )}
        {endLabel && <span>Jusqu’au {endLabel}</span>}
      </div>
    </div>
  )
}
