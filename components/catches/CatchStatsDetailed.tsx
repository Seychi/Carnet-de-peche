'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { CatchBreakdown } from '@/lib/catches/queries'

// ─── Dictionnaires ────────────────────────────────────────────────────────────

const SPECIES_LABELS: Record<string, string> = {
  bar: 'Bar',
  dorade_royale: 'Dorade royale',
  lieu_jaune: 'Lieu jaune',
  maquereau: 'Maquereau',
  sar: 'Sar',
  orphie: 'Orphie',
}

const TECHNIQUE_LABELS: Record<string, string> = {
  leurres: 'Leurres',
  surfcasting: 'Surfcasting',
  flottante: 'Flottante',
  vif: 'Vif',
}

const TABS = [
  { id: 'species' as const, label: 'Espèces' },
  { id: 'technique' as const, label: 'Techniques' },
  { id: 'month' as const, label: 'Mois' },
]

type Tab = 'species' | 'technique' | 'month'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast12Months(data: { month: string; count: number }[] | null) {
  const map = new Map(data?.map((d) => [d.month, d.count]) ?? [])
  const result: { key: string; label: string; count: number }[] = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('fr-FR', { month: 'short' })
    result.push({ key, label, count: map.get(key) ?? 0 })
  }
  return result
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function CatchStatsDetailed({
  breakdown,
  className,
}: {
  breakdown: CatchBreakdown
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('species')

  const isEmpty =
    !breakdown.bySpecies?.length &&
    !breakdown.byTechnique?.length &&
    !breakdown.byMonth?.length

  return (
    <div className={`bg-white rounded-[14px] border border-sand-200 overflow-hidden ${className ?? ''}`}>

      {/* En-tête / toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <span className="text-[11px] font-bold uppercase tracking-widest text-ink-500">
          Mes stats
        </span>
        {/* Chevron : visible sur mobile, caché sur desktop (la section est toujours ouverte via CSS) */}
        <ChevronDown
          size={16}
          className={`text-ink-400 transition-transform duration-200 sm:hidden ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Contenu : fermé sur mobile par défaut, toujours ouvert sur desktop */}
      <div className={`border-t border-slate-100 ${open ? 'block' : 'hidden sm:block'}`}>
        {isEmpty ? (
          <p className="text-[13px] text-ink-400 text-center py-10 px-5">
            Pas encore de prises loguées.
          </p>
        ) : (
          <div className="px-5 pb-5 pt-4 space-y-4">

            {/* Onglets */}
            <div className="flex gap-1 bg-slate-100 rounded-[10px] p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-1.5 rounded-[8px] text-[13px] font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-white text-navy-900 shadow-sm'
                      : 'text-ink-500 hover:text-ink-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Contenu de l'onglet actif */}
            {tab === 'species' && (
              <SpeciesChart data={breakdown.bySpecies} />
            )}
            {tab === 'technique' && (
              <TechniqueChart data={breakdown.byTechnique} />
            )}
            {tab === 'month' && (
              <MonthChart data={breakdown.byMonth} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function SpeciesChart({
  data,
}: {
  data: { species: string; count: number; avgSize: number | null }[] | null
}) {
  if (!data?.length) {
    return <EmptyChart />
  }
  const max = Math.max(...data.map((d) => d.count))
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.species} className="flex items-center gap-3">
          <span className="text-[12px] text-ink-600 w-24 shrink-0 truncate" title={SPECIES_LABELS[d.species] ?? d.species}>
            {SPECIES_LABELS[d.species] ?? d.species}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-500 h-2 rounded-full"
              style={{ width: `${max > 0 ? (d.count / max) * 100 : 0}%` }}
            />
          </div>
          <span className="font-mono text-[12px] font-semibold text-navy-900 w-6 text-right shrink-0">
            {d.count}
          </span>
          {d.avgSize != null && (
            <span className="font-mono text-[11px] text-ink-400 w-14 shrink-0 text-right">
              ⌀ {d.avgSize} cm
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function TechniqueChart({
  data,
}: {
  data: { technique: string; count: number }[] | null
}) {
  if (!data?.length) {
    return <EmptyChart />
  }
  const max = Math.max(...data.map((d) => d.count))
  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.technique} className="flex items-center gap-3">
          <span className="text-[12px] text-ink-600 w-24 shrink-0 truncate" title={TECHNIQUE_LABELS[d.technique] ?? d.technique}>
            {TECHNIQUE_LABELS[d.technique] ?? d.technique}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-500 h-2 rounded-full"
              style={{ width: `${max > 0 ? (d.count / max) * 100 : 0}%` }}
            />
          </div>
          <span className="font-mono text-[12px] font-semibold text-navy-900 w-6 text-right shrink-0">
            {d.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function MonthChart({
  data,
}: {
  data: { month: string; count: number }[] | null
}) {
  const months = getLast12Months(data)
  const max = Math.max(...months.map((m) => m.count), 1)
  return (
    <div className="space-y-2">
      {months.map((m) => (
        <div key={m.key} className="flex items-center gap-3">
          <span className="text-[11px] text-ink-400 w-10 shrink-0 capitalize">
            {m.label}
          </span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-teal-500 h-2 rounded-full"
              style={{ width: `${(m.count / max) * 100}%` }}
            />
          </div>
          <span
            className={`font-mono text-[12px] font-semibold w-5 text-right shrink-0 ${
              m.count > 0 ? 'text-navy-900' : 'text-slate-300'
            }`}
          >
            {m.count}
          </span>
        </div>
      ))}
    </div>
  )
}

function EmptyChart() {
  return (
    <p className="text-[13px] text-ink-400 text-center py-4">
      Pas encore de données pour cet onglet.
    </p>
  )
}
