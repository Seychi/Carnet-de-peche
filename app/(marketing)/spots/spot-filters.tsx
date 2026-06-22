'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const DEPARTMENTS = [
  { value: '14', label: '14 — Calvados' },
  { value: '17', label: '17 — Charente-Maritime' },
  { value: '22', label: '22 — Côtes-d\'Armor' },
  { value: '29', label: '29 — Finistère' },
  { value: '33', label: '33 — Gironde' },
  { value: '34', label: '34 — Hérault' },
  { value: '35', label: '35 — Ille-et-Vilaine' },
  { value: '40', label: '40 — Landes' },
  { value: '44', label: '44 — Loire-Atlantique' },
  { value: '50', label: '50 — Manche' },
  { value: '56', label: '56 — Morbihan' },
  { value: '62', label: '62 — Pas-de-Calais' },
  { value: '64', label: '64 — Pyrénées-Atlantiques' },
  { value: '66', label: '66 — Pyrénées-Orientales' },
  { value: '76', label: '76 — Seine-Maritime' },
  { value: '83', label: '83 — Var' },
  { value: '85', label: '85 — Vendée' },
]

const SPECIES = [
  { value: 'bar', label: 'Bar' },
  { value: 'dorade_royale', label: 'Dorade royale' },
  { value: 'lieu_jaune', label: 'Lieu jaune' },
  { value: 'maquereau', label: 'Maquereau' },
  { value: 'sar', label: 'Sar' },
  { value: 'orphie', label: 'Orphie' },
]

export function SpotFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentDept = searchParams.get('dept') ?? ''
  const currentSpecies = searchParams.get('espece') ?? ''

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap">
      {/* Filtre département */}
      <select
        value={currentDept}
        onChange={(e) => updateParam('dept', e.target.value)}
        className="w-full px-4 py-2.5 rounded-[10px] border border-ink-200 bg-white text-sm text-ink-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent sm:w-auto"
        aria-label="Filtrer par département"
      >
        <option value="">Tous les départements</option>
        {DEPARTMENTS.map((d) => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>

      {/* Filtre espèce — chips */}
      <div className="flex flex-wrap gap-2">
        {SPECIES.map((s) => (
          <button
            key={s.value}
            onClick={() => updateParam('espece', currentSpecies === s.value ? '' : s.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150 border ${
              currentSpecies === s.value
                ? 'bg-navy-900 text-white border-navy-900'
                : 'bg-white text-ink-700 border-ink-200 hover:border-navy-900 hover:text-navy-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
