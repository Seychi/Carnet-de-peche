import type { SpotFilters } from '@/lib/spots/filters-schema'

// Helpers filtres URL côté CLIENT — aucun import runtime volontairement :
// ce module est dans le bundle client de /carte (MapShell, MapFilters).
// Le parse + validation zod vit dans filter-url.server.ts (serveur uniquement).

// Sérialise les filtres actifs vers URLSearchParams (pour reconstruire l'URL).
// Les filtres vides/undefined sont omis.
export function serializeFiltersToSearchParams(filters: SpotFilters): URLSearchParams {
  const params = new URLSearchParams()
  filters.species?.forEach((s) => params.append('species', s))
  filters.techniques?.forEach((t) => params.append('techniques', t))
  if (filters.department) params.set('department', filters.department)
  if (filters.structure) params.set('structure', filters.structure)
  if (filters.difficulty !== undefined) params.set('difficulty', String(filters.difficulty))
  filters.source?.forEach((s) => params.append('source', s))
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
  if (filters.source?.length) count++
  return count
}

export function hasActiveFilters(filters: SpotFilters): boolean {
  return countActiveFilters(filters) > 0
}
