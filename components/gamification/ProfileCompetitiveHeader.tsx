import { Medal, Flame } from 'lucide-react'
import { RankProgress } from './RankProgress'
import { badgeTierLabel } from '@/lib/gamification/badges'
import type { PublicBadge } from '@/lib/gamification/public-badges'

// En-tête compétitif du profil public (Sprint 63) : rang + barre XP (60), série en cours
// (62) et 3 badges phares (62), en une surface cohérente sur le hero navy. Remplace l'ajout
// minimal du Sprint 60. Tout est PUBLIC mais sans fuite : XP/série/badges = agrégats exposés
// par des RPC definer gatées (aucune prise, aucun spot, aucune coordonnée). DALTONIEN-SAFE :
// chaque flair porte une icône + du texte, jamais la teinte seule.

export function ProfileCompetitiveHeader({
  totalXp,
  streakWeeks,
  badges,
}: {
  totalXp: number
  streakWeeks: number
  badges: PublicBadge[]
}) {
  const topBadges = badges.slice(0, 3)

  return (
    <>
      <div className="mt-2.5 max-w-[280px]">
        <RankProgress totalXp={totalXp} onDark />
      </div>

      {(streakWeeks > 0 || topBadges.length > 0) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {streakWeeks > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 font-mono text-[10px] font-medium text-white">
              <Flame size={11} className="shrink-0 text-coral-500" aria-hidden="true" />
              {streakWeeks} sem. d’affilée
            </span>
          )}
          {topBadges.map((b) => (
            <span
              key={b.slug}
              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 font-mono text-[10px] font-medium text-white"
            >
              <Medal size={11} className="shrink-0 text-gold-400" aria-hidden="true" />
              {badgeTierLabel(b.slug)}
            </span>
          ))}
        </div>
      )}
    </>
  )
}
