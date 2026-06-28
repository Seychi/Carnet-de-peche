'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { Filter, X } from 'lucide-react'
import { CARNET_SPECIES_OPTIONS } from '@/lib/seo/programmatic'

// Niveaux d'expérience de l'hôte (référentiel profiles.level, exposé par la vue en 088).
// Libellés FR locaux : pas de module central de labels de niveau dans le repo.
const LEVEL_OPTIONS: { value: string; label: string }[] = [
  { value: 'debutant', label: 'Débutant' },
  { value: 'intermediaire', label: 'Intermédiaire' },
  { value: 'expert', label: 'Expert' },
]

/**
 * Filtres de matching du board de co-pêchage : espèce + date plancher + niveau de
 * l'hôte + extension aux départements voisins. L'état vit dans l'URL
 * (?species=bar,sar&from=YYYY-MM-DD&level=expert&neighbors=1) → le Server Component
 * refiltre la query `getDeptProposals`. Aucune coordonnée, jamais : on filtre sur
 * espèce + date + niveau + département (jamais un point GPS).
 */
export function OutingFilters({
  selectedSpecies,
  from,
  level,
  includeNeighbors = false,
}: {
  selectedSpecies: string[]
  from?: string
  level?: string
  includeNeighbors?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const apply = useCallback(
    (next: {
      species?: string[]
      from?: string | null
      level?: string | null
      neighbors?: boolean
    }) => {
      const sp = new URLSearchParams(params.toString())
      if (next.species !== undefined) {
        if (next.species.length > 0) sp.set('species', next.species.join(','))
        else sp.delete('species')
      }
      if (next.from !== undefined) {
        if (next.from) sp.set('from', next.from)
        else sp.delete('from')
      }
      if (next.level !== undefined) {
        if (next.level) sp.set('level', next.level)
        else sp.delete('level')
      }
      if (next.neighbors !== undefined) {
        if (next.neighbors) sp.set('neighbors', '1')
        else sp.delete('neighbors')
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

  const hasFilters = selectedSpecies.length > 0 || !!from || !!level || includeNeighbors

  return (
    <div className="mb-4 rounded-[14px] border border-sand-200 bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-ink-600">
          <Filter size={13} /> Filtrer les sorties
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={() => apply({ species: [], from: null, level: null, neighbors: false })}
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

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[12px] text-ink-600">
          <span className="shrink-0">À partir du</span>
          <input
            type="date"
            value={from ?? ''}
            onChange={(e) => apply({ from: e.target.value || null })}
            className="min-h-11 rounded-[10px] border border-sand-200 px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
          />
        </label>

        <label className="flex items-center gap-2 text-[12px] text-ink-600">
          <span className="shrink-0">Niveau de l’hôte</span>
          <select
            value={level ?? ''}
            onChange={(e) => apply({ level: e.target.value || null })}
            className="min-h-11 rounded-[10px] border border-sand-200 bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
          >
            <option value="">Tous</option>
            {LEVEL_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-[12.5px] text-ink-600">
        <input
          type="checkbox"
          checked={includeNeighbors}
          onChange={(e) => apply({ neighbors: e.target.checked })}
          className="size-4 shrink-0 rounded border-sand-300 text-teal-500 focus:ring-2 focus:ring-teal-500/40"
        />
        Inclure les départements voisins
      </label>
    </div>
  )
}
