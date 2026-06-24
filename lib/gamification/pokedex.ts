import { SPECIES, type SpeciesSlug } from '@/lib/seo/programmatic'
import type { CatchBreakdown } from '@/lib/catches/queries'

// ─── Pokédex des espèces ───────────────────────────────────────────────────────
// PUR TS sur lecture (aucune table) : on croise le référentiel SPECIES (20 espèces,
// source unique) avec le breakdown du carnet (get_my_catches_breakdown, RLS own).
// Anti-comparaison : c'est TA collection, jamais un classement. Privé.

export type PokedexCard = {
  slug: SpeciesSlug
  label: string
  /** Espèce capturée au moins une fois → carte « débloquée ». */
  captured: boolean
  /** Nombre de prises de cette espèce (0 si non capturée). */
  count: number
  /** Plus grande taille loguée pour cette espèce (cm), si renseignée. DÉCLARATIF. */
  biggest: number | null
}

export type Pokedex = {
  cards: PokedexCard[]
  /** Espèces distinctes capturées (cartes débloquées). */
  capturedCount: number
  /** Total d'espèces au référentiel (20). */
  totalCount: number
}

/**
 * Construit les 20 cartes du Pokédex depuis le breakdown du carnet.
 * Le breakdown indexe par `species` = clé DB snake_case ; on fait le pont via
 * SPECIES[slug].dbKey. Une espèce absente du breakdown reste grisée (count 0).
 *
 * Note : `biggest` vient de `avgSize` du breakdown — le breakdown n'expose que la
 * taille MOYENNE par espèce, pas la max. On la traite donc comme « taille type »
 * (déclarative), pas comme un record. Le composant l'étiquette honnêtement.
 */
export function buildPokedex(breakdown: CatchBreakdown | null): Pokedex {
  // Index dbKey → { count, avgSize } depuis le breakdown (peut être null/vide).
  const byDbKey = new Map<string, { count: number; avgSize: number | null }>()
  for (const row of breakdown?.bySpecies ?? []) {
    if (!row || typeof row.species !== 'string') continue
    byDbKey.set(row.species, {
      count: Number(row.count) || 0,
      avgSize: row.avgSize == null ? null : Number(row.avgSize),
    })
  }

  const cards: PokedexCard[] = (Object.entries(SPECIES) as [SpeciesSlug, (typeof SPECIES)[SpeciesSlug]][]).map(
    ([slug, meta]) => {
      const hit = byDbKey.get(meta.dbKey)
      const count = hit?.count ?? 0
      return {
        slug,
        label: meta.label,
        captured: count > 0,
        count,
        biggest: hit?.avgSize != null && hit.avgSize > 0 ? Math.round(hit.avgSize) : null,
      }
    },
  )

  return {
    cards,
    capturedCount: cards.filter((c) => c.captured).length,
    totalCount: cards.length,
  }
}
