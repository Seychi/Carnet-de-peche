import { z } from 'zod'
import { catchSpeciesEnum, catchTechniqueEnum } from '@/lib/catches/schema'
import { spotFiltersSchema } from '@/lib/spots/filters-schema'
import type { SpotFilters } from '@/lib/spots/filters-schema'

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>

function getString(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined
  const v = params[key]
  return Array.isArray(v) ? v[0] : v
}

function getArray(params: RawParams, key: string): string[] {
  if (params instanceof URLSearchParams) return params.getAll(key)
  const v = params[key]
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

// Parse + valide les filtres depuis URLSearchParams ou un Record.
// Les valeurs invalides sont ignorées silencieusement.
export function parseFiltersFromSearchParams(params: RawParams): SpotFilters {
  const filters: SpotFilters = {}

  const speciesRaw = getArray(params, 'species')
  const speciesResult = z.array(catchSpeciesEnum).safeParse(speciesRaw)
  if (speciesResult.success && speciesResult.data.length > 0) {
    filters.species = speciesResult.data
  }

  const techniquesRaw = getArray(params, 'techniques')
  const techniquesResult = z.array(catchTechniqueEnum).safeParse(techniquesRaw)
  if (techniquesResult.success && techniquesResult.data.length > 0) {
    filters.techniques = techniquesResult.data
  }

  const deptRaw = getString(params, 'department')
  const deptResult = spotFiltersSchema.shape.department.safeParse(deptRaw)
  if (deptResult.success && deptResult.data !== undefined) {
    filters.department = deptResult.data
  }

  const structureRaw = getString(params, 'structure')
  const structureResult = spotFiltersSchema.shape.structure.safeParse(structureRaw)
  if (structureResult.success && structureResult.data !== undefined) {
    filters.structure = structureResult.data
  }

  const difficultyRaw = getString(params, 'difficulty')
  const difficultyResult = spotFiltersSchema.shape.difficulty.safeParse(difficultyRaw)
  if (difficultyResult.success && difficultyResult.data !== undefined) {
    filters.difficulty = difficultyResult.data
  }

  return filters
}

// Sérialise les filtres actifs vers URLSearchParams (pour reconstruire l'URL).
// Les filtres vides/undefined sont omis.
export function serializeFiltersToSearchParams(filters: SpotFilters): URLSearchParams {
  const params = new URLSearchParams()
  filters.species?.forEach((s) => params.append('species', s))
  filters.techniques?.forEach((t) => params.append('techniques', t))
  if (filters.department) params.set('department', filters.department)
  if (filters.structure) params.set('structure', filters.structure)
  if (filters.difficulty !== undefined) params.set('difficulty', String(filters.difficulty))
  return params
}

// Compte le nombre de dimensions de filtre actives (chaque clé = 1, quelle que soit la longueur des arrays).
export function countActiveFilters(filters: SpotFilters): number {
  let count = 0
  if (filters.species?.length) count++
  if (filters.techniques?.length) count++
  if (filters.department !== undefined) count++
  if (filters.structure !== undefined) count++
  if (filters.difficulty !== undefined) count++
  return count
}

export function hasActiveFilters(filters: SpotFilters): boolean {
  return countActiveFilters(filters) > 0
}
