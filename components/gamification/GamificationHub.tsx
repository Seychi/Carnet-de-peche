import { getMyGamification } from '@/lib/gamification/queries'
import { PokedexGrid } from './PokedexGrid'
import { StreakCard } from './StreakCard'
import { BadgesGrid } from './BadgesGrid'
import { ConservationChallenges } from './ConservationChallenges'

// Hub gamification (Server Component) — Pokédex, régularité, badges, défis conservation.
// Tout dérive du carnet → PRIVÉ et 100% GRATUIT (jamais gaté). Recalcule les badges
// au chargement (idempotent côté RPC). États vides honnêtes gérés par les enfants.

export async function GamificationHub({ className }: { className?: string }) {
  const { pokedex, streak, badges, challenges } = await getMyGamification()

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      <StreakCard streak={streak} />
      <PokedexGrid pokedex={pokedex} />
      <BadgesGrid badges={badges} />
      <ConservationChallenges challenges={challenges} />
    </div>
  )
}
