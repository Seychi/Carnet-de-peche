import Link from 'next/link'
import { Wind, Waves, Clock, Leaf, Info, Fish } from 'lucide-react'
import type { PersonalProfile, CatchPattern } from '@/lib/scoring/types'
import { PERSONAL_SCORING_CONFIG as CFG } from '@/lib/scoring/personal-config'

// ─── PersonalScoreSection ─────────────────────────────────────────────────────
// Vue DESCRIPTIVE : on montre où et quand tombent tes prises, sans prétendre
// mesurer une "réussite" (impossible sans logger les sorties bredouilles).

const FACTOR_META: Record<
  CatchPattern['factor'],
  { icon: typeof Wind; intro: string; missingHint: string }
> = {
  wind:   { icon: Wind,  intro: 'Par vent',   missingHint: 'le vent' },
  tide:   { icon: Waves, intro: 'En marée',   missingHint: 'la marée' },
  hour:   { icon: Clock, intro: 'Plutôt',     missingHint: 'l’horaire' },
  season: { icon: Leaf,  intro: 'Surtout',    missingHint: 'la saison' },
}

export function PersonalScoreSection({ profile }: { profile: PersonalProfile }) {
  const { patterns, hasEnoughData } = profile
  const total = profile.multiplier.basedOnCatches

  const withData = patterns.filter((p) => p.hasData && p.dominantLabel)
  const missing = patterns.filter((p) => !p.hasData)

  return (
    <section className="bg-white rounded-[18px] border border-ink-100 p-5 md:p-7 flex flex-col gap-6">
      <header>
        <h2 className="font-display text-navy-900 text-xl">Ton profil de pêcheur</h2>
        <p className="text-sm text-ink-500 mt-1">
          {total > 0
            ? `Là où tombent tes ${total} prise${total > 1 ? 's' : ''}`
            : 'Aucune prise loguée pour le moment'}
        </p>
      </header>

      {!hasEnoughData ? (
        <EmptyState count={total} />
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {withData.map((p) => (
              <PatternRow key={p.factor} pattern={p} />
            ))}
          </ul>

          {missing.length > 0 && (
            <p className="flex items-start gap-2 text-[13px] text-ink-500 bg-sand-50 rounded-[12px] p-3">
              <Info size={15} className="text-ink-400 mt-0.5 shrink-0" aria-hidden />
              <span>
                Renseigne {missing.map((m) => FACTOR_META[m.factor].missingHint).join(' et ')} sur
                tes prises pour voir aussi ces tendances.
              </span>
            </p>
          )}

          <p className="text-[11px] text-ink-400 leading-snug">
            Ces tendances décrivent où et quand tu logues tes prises — elles ne disent pas
            (encore) si tu pêches « mieux » dans ces conditions.
          </p>
        </>
      )}
    </section>
  )
}

// ─── Une ligne de pattern ─────────────────────────────────────────────────────

function PatternRow({ pattern }: { pattern: CatchPattern }) {
  const { icon: Icon, intro } = FACTOR_META[pattern.factor]
  return (
    <li className="flex items-center gap-3 bg-sand-50 rounded-[14px] px-4 py-3">
      <span className="w-9 h-9 rounded-full bg-white border border-ink-100 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-teal-500" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-navy-900">
          <span className="text-ink-500">{intro} </span>
          <span className="font-semibold">{pattern.dominantLabel}</span>
        </p>
        <p className="text-[12px] text-ink-400">
          {pattern.count} prise{pattern.count > 1 ? 's' : ''} sur {pattern.total}
        </p>
      </div>
    </li>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ count }: { count: number }) {
  const remaining = Math.max(1, CFG.MIN_CATCHES_FOR_INSIGHTS - count)
  return (
    <div className="flex flex-col items-center text-center gap-3 py-8 px-4 bg-sand-50 rounded-[14px]">
      <Fish size={36} className="text-teal-500" aria-hidden="true" />
      <p className="font-semibold text-navy-900">Pas encore assez de données</p>
      <p className="text-sm text-ink-500 max-w-xs">
        Logue {remaining} prise{remaining > 1 ? 's' : ''} de plus pour voir tes tendances de
        pêche.
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
