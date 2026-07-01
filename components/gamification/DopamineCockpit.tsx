import { getMyGamification } from '@/lib/gamification/queries'
import { getMySoloChallenges } from '@/lib/gamification/challenges-solo'
import { getUserXp } from '@/lib/gamification/progress'
import { RankProgress } from './RankProgress'
import { StreakCard } from './StreakCard'
import { ChallengesBoard } from './ChallengesBoard'
import { BadgesGrid } from './BadgesGrid'
import { PokedexGrid } from './PokedexGrid'
import { ConservationChallenges } from './ConservationChallenges'

// Cockpit de progression unifié (Sprint 63) — refonte du GamificationHub + HomeProgressCard
// (fondus ici pour ne PLUS empiler deux cartes « progression »). Ordre : niveau + XP (la
// tête), série avec urgence douce, défis actifs, badges, Pokédex, défis conservation. Tout
// dérive du carnet PROPRE → 100% GRATUIT, jamais gaté. États vides honnêtes côté enfants.
//
// La CÉLÉBRATION d'une complétion (défi/badge/record) se joue AU LOG de la prise
// (CelebrationOverlay, cf CatchForm) : ce cockpit est une surface de LECTURE, pas de
// double déclenchement. Les RECORDS restent sur /carnet et /profil (pas de doublon ici).

export async function DopamineCockpit({
  userId,
  className,
}: {
  userId: string
  className?: string
}) {
  const [{ pokedex, streak, badges, badgeMetrics, challenges }, soloChallenges, totalXp] =
    await Promise.all([getMyGamification(), getMySoloChallenges(), getUserXp(userId)])

  return (
    <div className={`space-y-3 ${className ?? ''}`}>
      {/* Niveau + XP : la « tête » du cockpit (fondu de l'ex-HomeProgressCard). */}
      <div className="rounded-[14px] border border-sand-200 bg-white px-4 py-3.5">
        <RankProgress totalXp={totalXp} />
      </div>
      <StreakCard streak={streak} />
      <ChallengesBoard items={soloChallenges} />
      <BadgesGrid badges={badges} metrics={badgeMetrics} />
      <PokedexGrid pokedex={pokedex} />
      <ConservationChallenges challenges={challenges} />
    </div>
  )
}
