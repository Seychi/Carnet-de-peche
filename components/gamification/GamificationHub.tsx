import { getMyGamification } from '@/lib/gamification/queries'
import { PokedexGrid } from './PokedexGrid'
import { StreakCard } from './StreakCard'
import { BadgesGrid } from './BadgesGrid'
import { ConservationChallenges } from './ConservationChallenges'

// Hub gamification (Server Component) — série, Pokédex, badges à paliers, défis
// conservation. Tout dérive du carnet → 100% GRATUIT (jamais gaté). Recalcule les
// badges au chargement (idempotent côté RPC). États vides honnêtes gérés par les enfants.
//
// Célébration : le déblocage d'un badge est fêté AU LOG DE LA PRISE par la primitive
// CelebrationOverlay (Sprint 61, lib/gamification/celebration.ts), qui lit les nouvelles
// familles à paliers via recompute_my_badges (099) + badgeTierLabel (Sprint 62). On ne
// remonte donc PAS une célébration concurrente ici (éviter le double déclenchement).

export async function GamificationHub({ className }: { className?: string }) {
  const { pokedex, streak, badges, badgeMetrics, challenges } = await getMyGamification()

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      <StreakCard streak={streak} />
      <PokedexGrid pokedex={pokedex} />
      <BadgesGrid badges={badges} metrics={badgeMetrics} />
      <ConservationChallenges challenges={challenges} />
    </div>
  )
}
