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
      <StatCard label="Total prises" value={String(stats.totalCount)} />
      <StatCard label="Ce mois" value={String(stats.thisMonthCount)} />
      <StatCard label="Plus gros" value={biggest} compact />
      <StatCard label="Taux relâche" value={`${stats.releasedRate} %`} />
    </div>
  )
}

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
    <div className="bg-white rounded-[14px] border border-slate-100 p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ink-400">{label}</p>
      <p
        className={`font-bold text-navy-900 mt-1 leading-tight ${
          compact ? 'text-[12px]' : 'text-[22px]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}
