'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { SpotFilters } from '@/lib/spots/filters-schema'
import type { UserTier } from '@/lib/auth/tier'
import { serializeFiltersToSearchParams, countActiveFilters, hasActiveFilters } from '@/lib/spots/filter-url'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

type Species = NonNullable<SpotFilters['species']>[number]
type Technique = NonNullable<SpotFilters['techniques']>[number]
type StructureValue = NonNullable<SpotFilters['structure']>

const ALL_SPECIES = Object.keys(SPECIES_LABELS) as Species[]
const ALL_TECHNIQUES = Object.keys(TECHNIQUE_LABELS) as Technique[]
const ALL_STRUCTURES: StructureValue[] = [
  'pointe_rocheuse',
  'plage',
  'digue',
  'estuaire',
  'cale',
  'passe',
  'cassure',
]

export type MapFiltersProps = {
  initialFilters: SpotFilters
  userTier: UserTier
  availableDepartments?: string[]
  userDepartment?: string
  onFiltersChange?: (filters: SpotFilters) => void
  onApply?: (filters: SpotFilters) => void
  spotCount?: number
  layout?: 'sidebar' | 'sheet'
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500 mb-2">
      {children}
    </p>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        active
          ? 'bg-teal-500 text-navy-950 font-semibold border border-teal-500'
          : 'bg-ink-100 text-ink-700 font-medium border border-ink-200 hover:bg-ink-200 hover:border-ink-300',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function DifficultyPicker({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? undefined : n)}
          aria-label={`Difficulté ${n}`}
          className={[
            'text-xl leading-none transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded',
            n <= (value ?? 0) ? 'text-amber-400' : 'text-ink-300 hover:text-amber-300',
          ].join(' ')}
        >
          ★
        </button>
      ))}
      {value !== undefined && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="ml-1 text-xs text-ink-400 hover:text-ink-700 underline"
        >
          Effacer
        </button>
      )}
    </div>
  )
}

const LS_KEY = 'carte:last-filters'

export default function MapFilters({
  initialFilters,
  userTier,
  availableDepartments = [],
  userDepartment,
  onFiltersChange,
  onApply,
  spotCount,
  layout = 'sidebar',
}: MapFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [filters, setFilters] = useState<SpotFilters>(initialFilters)
  const mounted = useRef(false)

  const routerRef = useRef(router)
  const onFiltersChangeRef = useRef(onFiltersChange)
  useEffect(() => { routerRef.current = router }, [router])
  useEffect(() => { onFiltersChangeRef.current = onFiltersChange }, [onFiltersChange])

  // Restaure depuis localStorage au mount si aucun filtre actif dans l'URL (sidebar uniquement)
  useEffect(() => {
    if (layout === 'sheet') return  // le sheet démarre toujours depuis l'état committed
    if (hasActiveFilters(initialFilters)) return
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (!saved) return
      const parsed = JSON.parse(saved) as SpotFilters
      // setState intentionnel au montage : on restaure les filtres depuis
      // localStorage APRÈS le premier render pour éviter un mismatch
      // d'hydratation SSR (le serveur ne connaît pas localStorage).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (hasActiveFilters(parsed)) setFilters(parsed)
    } catch {
      // localStorage indisponible (SSR, mode privé) — on ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync URL + localStorage avec debounce 300ms — sidebar uniquement
  // En mode sheet, le commit se fait uniquement via le bouton "Appliquer"
  useEffect(() => {
    if (layout === 'sheet') return
    if (!mounted.current) {
      mounted.current = true
      return
    }
    const id = setTimeout(() => {
      const params = serializeFiltersToSearchParams(filters)
      const qs = params.toString()
      routerRef.current.replace(pathname + (qs ? '?' + qs : ''), { scroll: false })
      onFiltersChangeRef.current?.(filters)
      try {
        if (hasActiveFilters(filters)) {
          localStorage.setItem(LS_KEY, JSON.stringify(filters))
        } else {
          localStorage.removeItem(LS_KEY)
        }
      } catch {
        // ignore
      }
    }, 300)
    return () => clearTimeout(id)
  }, [filters, pathname, layout])

  const isGated = userTier === 'anonymous' || userTier === 'discovery'
  const activeCount = countActiveFilters(filters)

  // ── Toggles ────────────────────────────────────────────────────────────────

  function toggleSpecies(sp: Species) {
    setFilters((prev): SpotFilters => ({
      ...prev,
      species: prev.species?.includes(sp)
        ? prev.species.filter((s) => s !== sp)
        : [...(prev.species ?? []), sp],
    }))
  }

  function toggleTechnique(t: Technique) {
    setFilters((prev): SpotFilters => ({
      ...prev,
      techniques: prev.techniques?.includes(t)
        ? prev.techniques.filter((x) => x !== t)
        : [...(prev.techniques ?? []), t],
    }))
  }

  function setStructure(v: string | null) {
    const value: StructureValue | undefined =
      !v || v === '_all' ? undefined : (v as StructureValue)
    setFilters((prev): SpotFilters => ({ ...prev, structure: value }))
  }

  function setDepartment(v: string | null) {
    const value: string | undefined = !v || v === '_all' ? undefined : v
    setFilters((prev): SpotFilters => ({ ...prev, department: value }))
  }

  function setDifficulty(v: number | undefined) {
    setFilters((prev): SpotFilters => ({ ...prev, difficulty: v }))
  }

  function resetFilters() {
    setFilters({})
    try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Bandeau gating */}
      {isGated && (
        <div className="mx-4 mt-4 mb-1 flex items-start gap-2 bg-ink-50 border border-ink-200 rounded-xl p-3">
          <Lock size={14} className="text-ink-400 mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-ink-600 leading-snug">
              Filtres disponibles avec{' '}
              <span className="font-semibold text-ink-900">Local</span> ou{' '}
              <span className="font-semibold text-ink-900">Itinérant</span>
            </p>
            <Link
              href="/tarifs"
              className="mt-1.5 inline-block text-xs font-semibold text-navy-950 bg-teal-500 hover:bg-teal-400 px-3 py-1 rounded-lg transition-colors"
            >
              Débloquer les filtres
            </Link>
          </div>
        </div>
      )}

      {/* Sections filtres — disabled visuellement si gated.
          inert (React 19) retire le panneau du tab order ET de l'arbre
          d'accessibilité — corrige l'audit axe « aria-hidden-focus »
          (les boutons restaient focusables au clavier sous aria-hidden). */}
      <div
        className={[
          'flex-1 overflow-y-auto space-y-5 p-4',
          isGated ? 'opacity-50 pointer-events-none select-none' : '',
        ].join(' ')}
        inert={isGated || undefined}
      >
        {/* Espèces */}
        <div>
          <SectionLabel>Espèces</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5 md:flex md:flex-wrap">
            {ALL_SPECIES.map((sp) => (
              <FilterChip
                key={sp}
                label={SPECIES_LABELS[sp]}
                active={filters.species?.includes(sp) ?? false}
                onClick={() => toggleSpecies(sp)}
              />
            ))}
          </div>
        </div>

        {/* Techniques */}
        <div>
          <SectionLabel>Techniques</SectionLabel>
          <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-wrap">
            {ALL_TECHNIQUES.map((t) => (
              <FilterChip
                key={t}
                label={TECHNIQUE_LABELS[t]}
                active={filters.techniques?.includes(t) ?? false}
                onClick={() => toggleTechnique(t)}
              />
            ))}
          </div>
        </div>

        {/* Structure */}
        <div>
          <SectionLabel>Structure</SectionLabel>
          <Select value={filters.structure ?? '_all'} onValueChange={setStructure}>
            <SelectTrigger className="w-full h-9 text-sm">
              <SelectValue>
                {(value) =>
                  !value || value === '_all'
                    ? 'Toutes les structures'
                    : STRUCTURE_LABELS[value] ?? value
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Toutes les structures</SelectItem>
              {ALL_STRUCTURES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STRUCTURE_LABELS[s] ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Département */}
        <div>
          <SectionLabel>Département</SectionLabel>
          {userTier === 'local' ? (
            <>
              <input
                type="text"
                disabled
                readOnly
                value={
                  userDepartment
                    ? `${userDepartment} — ${DEPARTMENT_LABELS[userDepartment] ?? userDepartment}`
                    : '—'
                }
                className="w-full h-9 px-3 rounded-lg border border-ink-200 bg-ink-50 text-sm text-ink-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-ink-400 mt-1">
                Disponible avec Itinérant pour changer de département
              </p>
            </>
          ) : userTier === 'itinerant' ? (
            <Select value={filters.department ?? '_all'} onValueChange={setDepartment}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue>
                  {(value) =>
                    !value || value === '_all'
                      ? 'Tous les départements'
                      : `${value} — ${DEPARTMENT_LABELS[value] ?? value}`
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Tous les départements</SelectItem>
                {availableDepartments.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code} — {DEPARTMENT_LABELS[code] ?? code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <input
              type="text"
              disabled
              readOnly
              value="Filtres non disponibles"
              className="w-full h-9 px-3 rounded-lg border border-ink-200 bg-ink-50 text-sm text-ink-500 cursor-not-allowed"
            />
          )}
        </div>

        {/* Difficulté */}
        <div>
          <SectionLabel>Difficulté max</SectionLabel>
          <DifficultyPicker value={filters.difficulty} onChange={setDifficulty} />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-3 border-t border-ink-100 flex items-center gap-3">
        <button
          type="button"
          onClick={resetFilters}
          disabled={activeCount === 0}
          className="text-sm text-ink-600 hover:text-ink-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Réinitialiser
          {activeCount > 0 && (
            <span className="ml-1 text-xs text-ink-400">({activeCount})</span>
          )}
        </button>

        <div className="flex-1 text-center">
          {spotCount !== undefined && spotCount === 0 && activeCount > 0 ? (
            <span className="text-xs text-amber-600 font-medium">
              Aucun spot · élargis les filtres
            </span>
          ) : spotCount !== undefined ? (
            <span className="text-xs text-ink-500">
              <span className="font-semibold text-ink-900">{spotCount}</span>{' '}
              spot{spotCount !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        {layout === 'sheet' && onApply && (
          <button
            type="button"
            onClick={() => onApply(filters)}
            className="px-4 py-1.5 bg-teal-500 hover:bg-teal-400 text-navy-950 text-sm font-semibold rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            Appliquer
          </button>
        )}
      </div>
    </div>
  )
}
