'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Filter, X } from 'lucide-react'
import { CARNET_SPECIES_OPTIONS } from '@/lib/seo/programmatic'

/**
 * Filtres de matching du board de co-pêchage : espèce + date plancher. L'état vit
 * dans l'URL (?species=bar,sar&from=YYYY-MM-DD) → le Server Component refiltre la
 * query `getDeptProposals`. Aucune coordonnée, jamais : on filtre sur espèce + date.
 */
export function OutingFilters({
  selectedSpecies,
  from,
}: {
  selectedSpecies: string[]
  from?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const apply = useCallback(
    (next: { species?: string[]; from?: string | null }) => {
      const sp = new URLSearchParams(params.toString())
      if (next.species !== undefined) {
        if (next.species.length > 0) sp.set('species', next.species.join(','))
        else sp.delete('species')
      }
      if (next.from !== undefined) {
        if (next.from) sp.set('from', next.from)
        else sp.delete('from')
      }
      const qs = sp.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  function toggleSpecies(key: string) {
    const next = selectedSpecies.includes(key)
      ? selectedSpecies.filter((s) => s !== key)
      : [...selectedSpecies, key]
    apply({ species: next })
  }

  const hasFilters = selectedSpecies.length > 0 || !!from

  return (
    <div className="mb-4 rounded-[14px] border border-sand-200 bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600">
          <Filter size={13} /> Filtrer les sorties
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => apply({ species: [], from: null })}
            className="inline-flex min-h-11 items-center gap-1 text-[12px] text-ink-500 hover:underline"
          >
            <X size={12} /> Réinitialiser
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CARNET_SPECIES_OPTIONS.map((s) => {
          const active = selectedSpecies.includes(s.value)
          return (
            <button
              key={s.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggleSpecies(s.value)}
              className={`rounded-full border px-2.5 py-1 text-[12.5px] transition-colors ${
                active
                  ? 'border-teal-500 bg-teal-500 font-medium text-navy-950'
                  : 'border-sand-200 bg-white text-ink-600 hover:border-teal-300'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      <label className="mt-3 flex items-center gap-2 text-[12px] text-ink-600">
        <span className="shrink-0">À partir du</span>
        <input
          type="date"
          value={from ?? ''}
          onChange={(e) => apply({ from: e.target.value || null })}
          className="min-h-11 rounded-[10px] border border-sand-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
        />
      </label>
    </div>
  )
}
