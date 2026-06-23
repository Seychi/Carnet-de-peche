import 'server-only'
import { z } from 'zod'
import { catchTechniqueEnum } from '@/lib/catches/schema'
import { spotFiltersSchema, spotSpeciesEnum } from '@/lib/spots/filters-schema'
import type { SpotFilters } from '@/lib/spots/filters-schema'

// Parse + validation zod des filtres URL — SERVEUR UNIQUEMENT.
// Séparé de filter-url.ts (importé par les composants client de la carte)
// pour garder zod hors du bundle client de /carte (audit perf sprint 11).
// Les helpers de sérialisation/comptage restent dans filter-url.ts (zéro dépendance).

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
  const speciesResult = z.array(spotSpeciesEnum).safeParse(speciesRaw)
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

  const sourceRaw = getArray(params, 'source')
  const sourceResult = spotFiltersSchema.shape.source.safeParse(sourceRaw)
  if (sourceResult.success && sourceResult.data && sourceResult.data.length > 0) {
    filters.source = sourceResult.data
  }

  return filters
}
