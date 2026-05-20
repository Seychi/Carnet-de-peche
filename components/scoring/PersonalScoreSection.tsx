import Link from 'next/link'
import type { PersonalProfile } from '@/lib/scoring/types'
import { PERSONAL_SCORING_CONFIG as CFG } from '@/lib/scoring/personal-config'
import { InsightCard } from './InsightCard'
import { MultiplierGauge } from './MultiplierGauge'

// ─── PersonalScoreSection ─────────────────────────────────────────────────────

export function PersonalScoreSection({ profile }: { profile: PersonalProfile }) {
  const { multiplier, insights, hasEnoughData } = profile
  const count = multiplier.basedOnCatches
  const showMultipliers = count >= CFG.MIN_CATCHES_FOR_MULTIPLIER

  // Insights : positifs d'abord, puis négatifs, chacun trié par catchRate décroissant
  const ordered = [...insights].sort((a, b) => {
    if (a.isPositive !== b.isPositive) return a.isPositive ? -1 : 1
    return b.catchRate - a.catchRate
  })

  return (
    <section className="bg-white rounded-[18px] border border-ink-100 p-5 md:p-7 flex flex-col gap-6">
      {/* Header */}
      <header>
        <h2 className="font-display text-navy-900 text-xl">Ton profil de pêcheur</h2>
        <p className="text-sm text-ink-500 mt-1">
          {count > 0
            ? `Basé sur ${count} prise${count > 1 ? 's' : ''} loguée${count > 1 ? 's' : ''}`
            : 'Aucune prise loguée pour le moment'}
        </p>
      </header>

      {!hasEnoughData ? (
        <EmptyState count={count} />
      ) : (
        <>
          {/* Grille multiplicateurs */}
          {showMultipliers && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wide">
                Tes multiplicateurs
              </h3>
              <div className="flex flex-col gap-3 bg-sand-50 rounded-[14px] p-5">
                <div className="flex items-start gap-4 md:gap-8">
                  <MultiplierGauge label="Vent" value={multiplier.wind} />
                  <MultiplierGauge label="Marée" value={multiplier.tide} />
                  <MultiplierGauge label="Horaires" value={multiplier.solunar} />
                </div>
                <p className="text-[11px] text-ink-400 text-center leading-snug">
                  Au-dessus de <span className="font-semibold text-ink-500">1×</span>, tu pêches
                  mieux que ta moyenne dans cette condition ; en-dessous, moins bien.
                </p>
              </div>
            </div>
          )}

          {/* Liste des insights */}
          {ordered.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ordered.map((insight, i) => (
                <InsightCard key={`${insight.factor}-${insight.label}-${i}`} insight={insight} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ count }: { count: number }) {
  const remaining = Math.max(1, CFG.MIN_CATCHES_FOR_INSIGHTS - count)
  return (
    <div className="flex flex-col items-center text-center gap-3 py-8 px-4 bg-sand-50 rounded-[14px]">
      <span className="text-4xl" aria-hidden>🎣</span>
      <p className="font-semibold text-navy-900">Pas encore assez de données</p>
      <p className="text-sm text-ink-500 max-w-xs">
        Logue {remaining} prise{remaining > 1 ? 's' : ''} de plus pour débloquer tes
        insights personnalisés.
      </p>
      <Link
        href="/carnet/nouvelle"
        className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Logger une prise
        <span aria-hidden>→</span>
      </Link>
    </div>
  )
}
