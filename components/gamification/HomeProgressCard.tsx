import { getUserXp } from '@/lib/gamification/progress'
import { RankProgress } from './RankProgress'

/**
 * Encart « Ta progression » du cockpit /home (Sprint 60) : rang + barre XP de l'utilisateur
 * courant. Composant DÉDIÉ et isolé (ne touche NI au GamificationHub Pokédex/badges/séries,
 * NI à la section « Près de toi ») → la refonte complète du cockpit dopamine viendra au
 * Sprint 63. Lecture seule. Best-effort : un pêcheur sans prise démarre honnêtement à
 * « Mousse · 0 / 100 XP ».
 */
export async function HomeProgressCard({ userId }: { userId: string }) {
  const totalXp = await getUserXp(userId)
  return (
    <div className="mb-3 rounded-[14px] border border-sand-200 bg-white px-4 py-3.5">
      <RankProgress totalXp={totalXp} />
    </div>
  )
}
