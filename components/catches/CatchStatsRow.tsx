import type { MyCatchStats } from '@/lib/catches/queries'

const SPECIES_LABELS: Record<string, string> = {
  bar: 'Bar',
  dorade_royale: 'Dorade royale',
  lieu_jaune: 'Lieu jaune',
  maquereau: 'Maquereau',
  sar: 'Sar',
  orphie: 'Orphie',
}

export function CatchStatsRow({
  stats,
  className,
}: {
  stats: MyCatchStats
  className?: string
}) {
  const biggest = stats.biggestCatch
    ? `${SPECIES_LABELS[stats.biggestCatch.species] ?? stats.biggestCatch.species} · ${stats.biggestCatch.size_cm} cm`
    : '—'

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 ${className ?? ''}`}>
      <StatCard label="prises au total" value={String(stats.totalCount)} />
      <StatCard label="ce mois-ci" value={String(stats.thisMonthCount)} />
      <StatCard label="record" value={biggest} compact />
      <StatCard label="taux de relâche" value={`${stats.releasedRate} %`} />
    </div>
  )
}

// Card stat DA v2 : valeur mono d'abord, légende dessous (réf carnet.html .stat).
function StatCard({
  label,
  value,
  compact,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div className="rounded-[14px] border border-sand-200 bg-white p-4">
      <p
        className={`font-mono font-semibold leading-tight text-navy-900 ${
          compact ? 'text-[14px] sm:text-[16px]' : 'text-[24px] sm:text-[28px]'
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[12.5px] text-ink-400 sm:text-[13.5px]">{label}</p>
    </div>
  )
}
