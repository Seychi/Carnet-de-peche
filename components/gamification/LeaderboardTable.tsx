'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Check, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getLeaderboard } from '@/app/actions/leaderboard'
import {
  LEADERBOARD_METRICS,
  LEADERBOARD_SCOPES,
  LEADERBOARD_PERIODS,
  metricMeta,
  isSpeciesFilterable,
  formatMetricValue,
  rankMedal,
  resolveLeaderboardView,
  type LeaderboardParams,
  type LeaderboardRow,
  type LeaderboardScope,
  type LeaderboardMetric,
  type LeaderboardPeriod,
} from '@/lib/gamification/leaderboard'
import type { SeasonOption } from '@/lib/gamification/season'
import { SPECIES_LABELS } from '@/lib/labels'
import { DEPARTMENT_OPTIONS } from '@/lib/geo/departments'
import { LeaderboardEmptyState } from './LeaderboardEmptyState'
import { ShareButton } from '@/components/share/ShareButton'

// Options espèces triées par label (source unique SPECIES_LABELS).
const SPECIES_OPTIONS = Object.entries(SPECIES_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((a, b) => a.label.localeCompare(b.label, 'fr'))

/** Puce de sélection (active = navy plein). L'info n'est jamais portée par la seule teinte. */
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      className={cn(
        'min-h-9 rounded-full px-3.5 text-[13.5px] font-medium transition-colors',
        active
          ? 'bg-navy-900 text-white'
          : 'border border-sand-200 bg-white text-ink-600 hover:bg-sand-100',
      )}
    >
      {children}
    </button>
  )
}

export function LeaderboardTable({
  initialRows,
  initialErrored = false,
  myUserId,
  homeDepartment,
  seasons,
  optedIn,
}: {
  initialRows: LeaderboardRow[]
  /** true si le fetch SSR a échoué → on montre l'erreur, pas un faux « vide ». */
  initialErrored?: boolean
  myUserId: string
  homeDepartment: string | null
  /** Saison courante + saisons passées (Sprint 67), offset 0 en tête. */
  seasons: SeasonOption[]
  optedIn: boolean
}) {
  const [params, setParams] = useState<LeaderboardParams>({
    scope: 'national',
    metric: 'xp',
    period: 'season',
    dept: homeDepartment,
    species: null,
    seasonOffset: 0,
  })
  const [rows, setRows] = useState<LeaderboardRow[]>(initialRows)
  const [loading, setLoading] = useState(false)
  const [errored, setErrored] = useState(initialErrored)
  // Jeton de requête : ignore les réponses obsolètes (clics rapides sur les sélecteurs →
  // fetchs concurrents ; sans ce garde, une réponse en retard écraserait le bon résultat).
  const requestId = useRef(0)

  async function apply(patch: Partial<LeaderboardParams>) {
    const next: LeaderboardParams = { ...params, ...patch }
    // Le scope département a besoin d'un département (défaut = domicile).
    if (next.scope === 'department' && !next.dept) next.dept = homeDepartment
    // Le filtre espèce n'a de sens que pour « prises » et « plus grosse ».
    if (!isSpeciesFilterable(next.metric)) next.species = null
    const id = ++requestId.current
    setParams(next)
    setLoading(true)
    setErrored(false)
    const res = await getLeaderboard(next)
    // Réponse obsolète (une requête plus récente est partie) → on l'ignore, sans toucher
    // rows/loading (la dernière requête s'en chargera).
    if (id !== requestId.current) return
    setLoading(false)
    if (res.ok) setRows(res.rows)
    else {
      setRows([])
      setErrored(true)
    }
  }

  const meta = metricMeta(params.metric)
  const currentOffset = params.seasonOffset ?? 0
  const selectedSeason = seasons.find((s) => s.offset === currentOffset) ?? seasons[0]
  const periodLabel =
    params.period === 'season' ? `Saison ${selectedSeason?.label ?? ''}`.trim() : 'Depuis le début'
  // Sprint 69 : la RPC renvoie TOUJOURS la ligne du caller opté-in (is_self) +
  // eligible_count. Le helper pur décide : vide / « ton rang » seul / tableau.
  const view = resolveLeaderboardView(rows, params.scope)

  // Carte « Ton rang » : toujours visible pour l'opté-in dès qu'il a une ligne.
  const myRow = view.kind === 'table' ? view.myRow : view.kind === 'under_threshold' ? view.myRow : null
  const rankCard = myRow && (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-[14px] border border-teal-500/40 bg-teal-500/[0.07] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-navy-900 font-mono text-[14px] font-bold text-white">
          {myRow.rank}
        </span>
        <div>
          <p className="text-[14px] font-semibold text-navy-900">Ton rang</p>
          <p className="text-[12px] text-ink-500">
            {view.kind === 'under_threshold'
              ? 'Visible de toi seul pour le moment.'
              : `Sur ${myRow.eligibleCount} pêcheur${myRow.eligibleCount > 1 ? 's' : ''} classé${myRow.eligibleCount > 1 ? 's' : ''}.`}
          </p>
        </div>
      </div>
      <span className="font-mono text-[15px] font-semibold tabular-nums text-navy-900">
        {formatMetricValue(params.metric, myRow.metricValue)}
      </span>
    </div>
  )

  return (
    <div>
      {/* Métriques */}
      <div className="flex flex-wrap gap-2">
        {LEADERBOARD_METRICS.map((m) => (
          <Chip
            key={m.value}
            active={params.metric === m.value}
            onClick={() => apply({ metric: m.value as LeaderboardMetric })}
          >
            {m.label}
          </Chip>
        ))}
      </div>

      {/* Portée + période */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {LEADERBOARD_SCOPES.map((s) => (
          <Chip
            key={s.value}
            active={params.scope === s.value}
            onClick={() => apply({ scope: s.value as LeaderboardScope })}
          >
            {s.label}
          </Chip>
        ))}

        <span className="mx-1 hidden h-5 w-px bg-sand-200 sm:block" aria-hidden="true" />

        {LEADERBOARD_PERIODS.map((p) => (
          <Chip
            key={p.value}
            active={params.period === p.value}
            onClick={() => apply({ period: p.value as LeaderboardPeriod })}
          >
            {p.label}
          </Chip>
        ))}
      </div>

      {/* Sélecteur de saison (Sprint 67) : uniquement en mode « Saison ». La saison
          courante est en tête ; les précédentes sont consultables (podium recalculé). */}
      {params.period === 'season' && seasons.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-400">
            Saison
          </span>
          {seasons.map((s) => (
            <Chip
              key={s.offset}
              active={currentOffset === s.offset}
              onClick={() => apply({ seasonOffset: s.offset })}
            >
              {s.offset === 0 ? `${s.label} (en cours)` : s.label}
            </Chip>
          ))}
        </div>
      )}

      {/* Filtres contextuels : département (scope=department) + espèce (metrics prises) */}
      {(params.scope === 'department' || isSpeciesFilterable(params.metric)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {params.scope === 'department' && (
            <label className="flex items-center gap-2 text-[13px] text-ink-600">
              <span className="sr-only">Département</span>
              <select
                value={params.dept ?? ''}
                onChange={(e) => apply({ dept: e.target.value || null })}
                className="min-h-9 rounded-full border border-sand-200 bg-white px-3 text-[13.5px] text-navy-900"
              >
                <option value="">Choisis un département</option>
                {DEPARTMENT_OPTIONS.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {isSpeciesFilterable(params.metric) && (
            <label className="flex items-center gap-2 text-[13px] text-ink-600">
              <span className="sr-only">Espèce</span>
              <select
                value={params.species ?? ''}
                onChange={(e) => apply({ species: e.target.value || null })}
                className="min-h-9 rounded-full border border-sand-200 bg-white px-3 text-[13.5px] text-navy-900"
              >
                <option value="">Toutes espèces</option>
                {SPECIES_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {/* Contexte de la métrique + garde-fou honnêteté */}
      <p className="mt-3 flex items-start gap-1.5 text-[12.5px] leading-snug text-ink-400">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>
          {meta.hint} {periodLabel}. Jamais de spot ni de coordonnée : que des pseudos et des
          stats.
        </span>
      </p>

      {/* Nudge opt-in (l'utilisateur peut voir les classements sans y figurer) */}
      {!optedIn && (
        <div className="mt-4 rounded-[12px] border border-gold-500/30 bg-gold-500/[0.06] px-4 py-3 text-[13.5px] text-navy-900">
          Tu n&apos;apparais pas encore dans les classements.{' '}
          <Link href="/profil" className="font-semibold text-gold-700 underline underline-offset-2">
            Active ta visibilité
          </Link>{' '}
          (ton pseudo et tes stats, jamais tes spots).
        </div>
      )}

      {/* Résultats */}
      <div className="mt-5" aria-busy={loading ? 'true' : 'false'}>
        {errored ? (
          <p className="rounded-[14px] border border-coral-500/30 bg-coral-500/[0.06] px-5 py-6 text-center text-[14px] text-navy-900">
            Le classement n&apos;a pas pu se charger. Réessaie dans un instant.
          </p>
        ) : loading ? (
          <ul className="flex flex-col gap-2" aria-hidden="true">
            {Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="h-14 animate-pulse rounded-[12px] bg-sand-100" />
            ))}
          </ul>
        ) : params.scope === 'department' && !params.dept ? (
          // Cas distinct de l'état vide k-anon : le pêcheur n'a pas (encore) de département.
          <div className="rounded-[14px] border border-dashed border-sand-200 bg-white px-6 py-8 text-center text-[14px] text-ink-600">
            Choisis un département ci-dessus pour voir son classement.
          </div>
        ) : view.kind === 'empty' ? (
          <LeaderboardEmptyState scope={params.scope} optedIn={optedIn} />
        ) : view.kind === 'under_threshold' ? (
          // Sous le seuil k-anon (sprint 69) : ton rang est visible, les identités
          // tierces non. On dit POURQUOI et combien il en manque, avec un partage
          // pour faire venir du monde (mécanique cartes S45/S47, rien de nouveau).
          <div>
            {rankCard}
            <div className="rounded-[14px] border border-dashed border-sand-200 bg-white px-6 py-8 text-center">
              <p className="text-[14px] font-semibold text-navy-900">
                Classement publié à partir de 3 pêcheurs visibles.
              </p>
              <p className="mt-1 text-[13.5px] text-ink-600">
                Il en manque{' '}
                <span className="font-mono font-semibold text-navy-900">{view.missing}</span>.
                Partage tes records pour donner envie aux copains de se classer.
              </p>
              <div className="mt-4 flex justify-center">
                <ShareButton
                  input={{ kind: 'records' }}
                  title="Mes records de pêche"
                  text="Mes records sur Carnet de Pêche. Viens te mesurer, sans jamais dévoiler un spot."
                  label="Partager mes records"
                  variant="ghost"
                />
              </div>
            </div>
          </div>
        ) : (
          <div>
            {rankCard}
          <ol className="flex flex-col gap-1.5">
            {rows.map((row) => {
              const isMe = row.userId === myUserId
              const medal = rankMedal(row.rank)
              const name = row.username ?? '?'
              return (
                <li key={row.userId}>
                  <div
                    className={cn(
                      'flex items-center gap-3 rounded-[12px] border px-3 py-2.5',
                      isMe ? 'border-teal-500/40 bg-teal-500/[0.07]' : 'border-sand-200 bg-white',
                    )}
                  >
                    {/* Rang (chiffre TOUJOURS visible ; médaille = bonus, pas l'info seule) */}
                    <span className="flex w-8 shrink-0 items-center justify-center font-mono text-[15px] font-semibold tabular-nums text-ink-600">
                      {medal ?? `${row.rank}`}
                    </span>

                    <Avatar className="size-9 shrink-0">
                      {row.avatarUrl && <AvatarImage src={row.avatarUrl} alt="" />}
                      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      {row.username ? (
                        <Link
                          href={`/u/${row.username}`}
                          className="truncate text-[14.5px] font-semibold text-navy-900 hover:text-teal-700"
                        >
                          @{row.username}
                        </Link>
                      ) : (
                        <span className="text-[14.5px] font-semibold text-ink-500">Pêcheur</span>
                      )}
                      {isMe && (
                        <span className="ml-2 rounded-full bg-navy-900 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-white">
                          toi
                        </span>
                      )}
                    </div>

                    <span className="flex shrink-0 items-center gap-1 font-mono text-[15px] font-semibold tabular-nums text-navy-900">
                      {formatMetricValue(params.metric, row.metricValue)}
                      {meta.verifiedOnly && (
                        <span
                          title="Record mesuré et photo-vérifié"
                          className="inline-flex items-center text-teal-700"
                        >
                          <Check size={14} strokeWidth={2.5} aria-label="vérifié" />
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              )
            })}
          </ol>
          </div>
        )}
      </div>
    </div>
  )
}
