import Link from 'next/link'
import { Sparkles, Plus, ArrowRight } from 'lucide-react'
// Import des sous-modules CLIENT-SAFE (config/types), PAS du barrel index qui
// réexporte fetch.ts (createClient → next/headers) : ce composant est rendu côté
// client quand il est monté dans ScorePanel ('use client').
import type { PersonalTendencies as Tendencies } from '@/lib/scoring/personal/types'
import { CONFIDENCE_LABELS, FACTOR_LABELS } from '@/lib/scoring/personal/config'
import type { UserTier } from '@/lib/auth/tier'
import { PersonalTendenciesUpsell } from './PersonalTendenciesUpsell'

// Composant UNIQUE « score global + TES tendances » (sprint 22, Chantier A).
// Remplace PersonalScoreSection (profil) + PersonalInsights (carte). 3 états :
// plein / dégradé / vide. DESCRIPTIF, jamais prédictif (contrainte 7.5) : on
// décrit OÙ et QUAND tombent tes prises, pas si tu « pêches mieux ». Jamais de
// chiffre 0-100 perso (ce serait re-fabriquer le multiplicateur neutralisé en 7.5).
// Daltonien-safe : la confiance est TOUJOURS un libellé texte, jamais une couleur seule.

type Props = {
  data: Tendencies
  /** Libellé d'espèce pour le contexte (« de bar »), optionnel. */
  speciesLabel?: string | null
  /** Libellé de lieu (« ici », nom du spot), optionnel. */
  scopeLabel?: string | null
  /** Rendu compact pour le panneau carte (sinon carte pleine). */
  compact?: boolean
  className?: string
  /**
   * Tier de l'utilisateur (optionnel). Si fourni ET non abonné (ni local ni
   * itinérant), on affiche un soft-upsell de la NOTIF perso proactive APRÈS la liste
   * (état plein seulement). La TENDANCE reste gratuite : on ne vend que la proactivité.
   */
  tier?: UserTier
}

function pct(share: number): string {
  return `${Math.round(share * 100)} %`
}

function contextSuffix(speciesLabel?: string | null, scopeLabel?: string | null): string {
  const parts: string[] = []
  if (speciesLabel) parts.push(`de ${speciesLabel}`)
  if (scopeLabel) parts.push(scopeLabel)
  return parts.length ? ` ${parts.join(' ')}` : ''
}

export function PersonalTendencies({ data, speciesLabel, scopeLabel, compact, className, tier }: Props) {
  const suffix = contextSuffix(speciesLabel, scopeLabel)
  const wrap = compact
    ? `text-left ${className ?? ''}`
    : `rounded-[18px] border border-sand-200 bg-white p-5 ${className ?? ''}`

  // ── État VIDE : aucune prise dans le périmètre ──────────────────────────────
  if (data.sampleCount === 0) {
    return (
      <div className={wrap}>
        <Header compact={compact} />
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">
          Loggue tes prises{suffix} pour voir où et quand elles tombent. Plus tu logues, plus ton
          carnet te parle.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/carnet/nouvelle"
            className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800"
          >
            <Plus size={14} /> Loguer une prise
          </Link>
          <Link
            href="/carnet/import"
            className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-3.5 py-1.5 text-[12.5px] font-semibold text-ink-700 transition-colors hover:border-teal-500/50"
          >
            Ajouter mes prises passées
          </Link>
        </div>
      </div>
    )
  }

  // ── État DÉGRADÉ : trop peu de prises pour des tendances ────────────────────
  if (!data.hasEnough) {
    const n = data.minToUnlock
    return (
      <div className={wrap}>
        <Header compact={compact} />
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">
          Encore <span className="font-mono font-semibold text-navy-900">{n}</span> prise
          {n > 1 ? 's' : ''}{suffix} pour débloquer tes tendances. Tu en as déjà{' '}
          <span className="font-mono font-semibold text-navy-900">{data.sampleCount}</span>.
        </p>
        <Link
          href="/carnet/nouvelle"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-800"
        >
          <Plus size={14} /> Loguer une prise
        </Link>
      </div>
    )
  }

  // ── État PLEIN : tendances descriptives ─────────────────────────────────────
  const rows = data.tendencies.slice(0, compact ? 3 : 5)
  return (
    <div className={wrap}>
      <Header compact={compact} suffix={suffix} sampleCount={data.sampleCount} />
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((t) => (
          <li
            key={t.factor}
            className="flex items-start justify-between gap-3 border-b border-sand-100 pb-2.5 last:border-0 last:pb-0"
          >
            <div className="min-w-0">
              <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-400">
                {FACTOR_LABELS[t.factor] ?? t.factor}
              </span>
              <p className="mt-0.5 text-[14px] leading-snug text-navy-900">
                <span className="font-mono font-semibold">{pct(t.share)}</span> de tes prises {t.label}
              </p>
            </div>
            <span className="shrink-0 pt-0.5 text-right font-mono text-[10.5px] leading-tight text-ink-400">
              {t.count}/{t.sampleCount}
              <br />
              {CONFIDENCE_LABELS[t.confidence]}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
        Ces tendances décrivent <strong className="font-medium text-ink-500">où et quand</strong>{' '}
        tombent tes prises — pas si tu pêches mieux. Calculé sur tes vraies prises.
      </p>
      {/* Soft-upsell : on vend l'ALERTE proactive (Local+), jamais la tendance (gratuite). */}
      {tier !== undefined && tier !== 'local' && tier !== 'itinerant' && (
        <PersonalTendenciesUpsell />
      )}
    </div>
  )
}

function Header({
  compact,
  suffix,
  sampleCount,
}: {
  compact?: boolean
  suffix?: string
  sampleCount?: number
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium uppercase tracking-[0.08em] text-teal-700">
        <Sparkles size={13} className="text-gold-500" aria-hidden="true" />
        Tes tendances{suffix ? <span className="text-ink-400">{suffix}</span> : null}
      </span>
      {!compact && sampleCount ? (
        <span className="font-mono text-[10.5px] text-ink-400">{sampleCount} prises</span>
      ) : null}
    </div>
  )
}

// Lien réutilisable « voir tout » pour la carte (optionnel).
export function PersonalTendenciesLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-700 transition-all hover:gap-1.5"
    >
      Tout voir <ArrowRight size={13} />
    </Link>
  )
}
