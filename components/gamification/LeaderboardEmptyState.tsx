import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { LeaderboardScope } from '@/lib/gamification/leaderboard'

// État vide DIGNE (Sprint 66) — crucial tant que le réservoir se remplit : un classement
// à 2 pêcheurs « fait triste » (décision John), donc sous le seuil k-anon la RPC ne renvoie
// rien et on affiche ce message honnête plutôt qu'un tableau vide. Jamais humiliant.
export function LeaderboardEmptyState({
  scope,
  optedIn,
}: {
  scope: LeaderboardScope
  optedIn: boolean
}) {
  const message =
    scope === 'follows'
      ? "Aucun des pêcheurs que tu suis n'apparaît encore ici. Suis-en d'autres, ou invite tes potes à activer leur classement."
      : "Le classement s'anime dès que plusieurs pêcheurs loguent publiquement. Encore un peu de patience, le coin se remplit."

  return (
    <div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-sand-200 bg-white px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sand-100 text-gold-700">
        <Trophy size={20} strokeWidth={1.7} aria-hidden="true" />
      </span>
      <p className="max-w-sm text-[14px] leading-relaxed text-ink-600">{message}</p>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/carnet/nouvelle"
          className="inline-flex min-h-11 items-center rounded-full bg-navy-900 px-4 text-[14px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          Loguer une prise
        </Link>
        {!optedIn && (
          <Link
            href="/profil"
            className="inline-flex min-h-11 items-center rounded-full border border-sand-200 px-4 text-[14px] font-medium text-navy-900 transition-colors hover:bg-sand-100"
          >
            Apparaître dans les classements
          </Link>
        )}
      </div>
    </div>
  )
}
