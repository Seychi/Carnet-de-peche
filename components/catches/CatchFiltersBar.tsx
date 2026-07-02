'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { subDays, subMonths, subYears, format } from 'date-fns'
import { CARNET_SPECIES_OPTIONS, CORE_SPECIES_DB_KEYS } from '@/lib/seo/programmatic'

// ─── Constantes ───────────────────────────────────────────────────────────────

// Source unique = référentiel SPECIES (26 espèces, cœur d'abord) — même liste
// que le formulaire de prise. Fini la liste codée en dur à 6 (audit 07-02 §4.7).
const SPECIES_OPTIONS = CARNET_SPECIES_OPTIONS
const CORE_SPECIES_SET = new Set(CORE_SPECIES_DB_KEYS)

const TECHNIQUE_OPTIONS = [
  { value: 'leurres', label: 'Leurres' },
  { value: 'surfcasting', label: 'Surfcasting' },
  { value: 'flottante', label: 'Flottante' },
  { value: 'vif', label: 'Vif' },
]

type Period = '7j' | '30j' | '3m' | 'an' | 'tout'

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7j', label: '7 j' },
  { value: '30j', label: '30 j' },
  { value: '3m', label: '3 mois' },
  { value: 'an', label: 'Année' },
  { value: 'tout', label: 'Tout' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateFrom(period: Period): string | undefined {
  const today = new Date()
  switch (period) {
    case '7j':  return format(subDays(today, 7), 'yyyy-MM-dd')
    case '30j': return format(subDays(today, 30), 'yyyy-MM-dd')
    case '3m':  return format(subMonths(today, 3), 'yyyy-MM-dd')
    case 'an':  return format(subYears(today, 1), 'yyyy-MM-dd')
    default:    return undefined
  }
}

function detectPeriod(dateFrom: string): Period {
  if (!dateFrom) return 'tout'
  const today = new Date()
  if (dateFrom === format(subDays(today, 7), 'yyyy-MM-dd')) return '7j'
  if (dateFrom === format(subDays(today, 30), 'yyyy-MM-dd')) return '30j'
  if (dateFrom === format(subMonths(today, 3), 'yyyy-MM-dd')) return '3m'
  if (dateFrom === format(subYears(today, 1), 'yyyy-MM-dd')) return 'an'
  return 'tout'
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function CatchFiltersBar({
  initialSpecies,
  initialTechniques,
  initialDateFrom,
  className,
}: {
  initialSpecies: string[]
  initialTechniques: string[]
  initialDateFrom: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()

  // Replié par défaut : les 6 espèces cœur + celles déjà filtrées. « Toutes les
  // espèces » déplie les 26 du référentiel (pattern quick-picks du formulaire).
  const [speciesExpanded, setSpeciesExpanded] = useState(false)
  const visibleSpecies = speciesExpanded
    ? SPECIES_OPTIONS
    : SPECIES_OPTIONS.filter(
        (opt) => CORE_SPECIES_SET.has(opt.value) || initialSpecies.includes(opt.value),
      )

  const currentPeriod = detectPeriod(initialDateFrom)
  const hasFilters =
    initialSpecies.length > 0 || initialTechniques.length > 0 || !!initialDateFrom

  function buildUrl(
    species: string[],
    technique: string[],
    dateFrom: string | undefined
  ): string {
    const params = new URLSearchParams()
    species.forEach((s) => params.append('species', s))
    technique.forEach((t) => params.append('technique', t))
    if (dateFrom) params.set('dateFrom', dateFrom)
    const qs = params.toString()
    return `${pathname}${qs ? `?${qs}` : ''}`
  }

  function toggleSpecies(species: string) {
    const next = initialSpecies.includes(species)
      ? initialSpecies.filter((s) => s !== species)
      : [...initialSpecies, species]
    router.replace(buildUrl(next, initialTechniques, initialDateFrom || undefined))
  }

  function toggleTechnique(technique: string) {
    const next = initialTechniques.includes(technique)
      ? initialTechniques.filter((t) => t !== technique)
      : [...initialTechniques, technique]
    router.replace(buildUrl(initialSpecies, next, initialDateFrom || undefined))
  }

  function selectPeriod(period: Period) {
    router.replace(buildUrl(initialSpecies, initialTechniques, getDateFrom(period)))
  }

  return (
    <div className={`bg-white rounded-[14px] border border-slate-100 p-4 shadow-sm ${className ?? ''}`}>

      {/* Espèces */}
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-2">
          Espèce
        </p>
        <div className="flex flex-wrap gap-1.5">
          {visibleSpecies.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleSpecies(opt.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                initialSpecies.includes(opt.value)
                  ? 'bg-teal-500 text-navy-950 border-teal-500'
                  : 'bg-slate-50 text-ink-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSpeciesExpanded((v) => !v)}
            aria-expanded={speciesExpanded ? 'true' : 'false'}
            className="px-3 py-1.5 rounded-full text-[12px] font-medium border border-dashed border-slate-300 bg-white text-ink-500 transition-colors hover:border-teal-300 hover:text-ink-700"
          >
            {speciesExpanded
              ? 'Réduire'
              : `Toutes les espèces (${SPECIES_OPTIONS.length})`}
          </button>
        </div>
      </div>

      {/* Techniques */}
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-2">
          Technique
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TECHNIQUE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleTechnique(opt.value)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-colors ${
                initialTechniques.includes(opt.value)
                  ? 'bg-teal-500 text-navy-950 border-teal-500'
                  : 'bg-slate-50 text-ink-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Période + Réinitialiser */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-400 mb-2">
            Période
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectPeriod(opt.value)}
                className={`px-2.5 py-1.5 rounded-[8px] text-[12px] font-medium border transition-colors ${
                  currentPeriod === opt.value
                    ? 'bg-navy-900 text-white border-navy-900'
                    : 'bg-slate-50 text-ink-600 border-slate-200 hover:border-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => router.replace(pathname)}
            className="shrink-0 text-[12px] text-ink-400 underline underline-offset-2 hover:text-ink-700 transition-colors"
          >
            Réinitialiser
          </button>
        )}
      </div>
    </div>
  )
}
