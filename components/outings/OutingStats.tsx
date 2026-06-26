import Link from 'next/link'
import { Wind, Plus } from 'lucide-react'
import type { OutingStats as OutingStatsData } from '@/lib/outings/queries'

// Stats sorties (dont bredouilles) + entrée pour loguer une sortie. Le « % bredouille »
// est honnête : il donne du sens aux séries sans prise et prépare le futur score.

export function OutingStats({ data, className }: { data: OutingStatsData; className?: string }) {
  if (data.totalOutings === 0) {
    return (
      <Link
        href="/carnet/sortie"
        className={`flex items-center gap-3 rounded-[14px] border border-dashed border-sand-300 bg-white px-4 py-3 transition-colors hover:border-teal-400 ${className ?? ''}`}
      >
        <Wind size={18} className="shrink-0 text-teal-600" />
        <span className="flex-1 text-[13px] text-ink-600">
          Sorti sans rien ? <span className="font-medium text-navy-900">Logue ta sortie</span>, même
          une bredouille compte (et rend tes stats honnêtes).
        </span>
        <Plus size={16} className="shrink-0 text-ink-400" />
      </Link>
    )
  }

  return (
    <div className={`rounded-[14px] border border-sand-200 bg-white px-4 py-3 ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-wide text-ink-400">
          <Wind size={14} className="text-teal-600" /> Sorties
        </div>
        <Link href="/carnet/sortie" className="text-[12px] font-medium text-teal-600 hover:text-teal-700">
          + Loguer une sortie
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat value={String(data.totalOutings)} label="sorties" />
        <Stat value={`${data.blankRate}%`} label="bredouille" />
        <Stat value={data.catchesPerOuting.toFixed(2).replace('.', ',')} label="prises/sortie" />
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[10px] bg-slate-50 px-3 py-2 text-center">
      <p className="font-mono text-[18px] font-bold leading-none text-navy-900 tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-ink-400">{label}</p>
    </div>
  )
}
