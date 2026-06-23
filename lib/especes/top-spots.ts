import 'server-only'
import { createClient } from '@/lib/supabase/server'

// « Meilleurs spots pour l'espèce » de la fiche /especes (sprint 23, WS-B / D-B4).
// Appelle la RPC 049 get_top_spots_for_species (tri par signal réel de l'espèce + gating
// coords). La migration 049 est un FICHIER (application = John) : tant qu'elle n'est pas
// en base, on REPLIE proprement sur une requête simple `contains(species)` (l'ancienne
// sidebar, non triée) — la fiche ne casse jamais.

export type TopSpot = {
  id: string
  name: string
  slug: string
  department: string
  structure: string | null
  /** Prises publiques de l'espèce au spot (k-anon : 0 si < K). */
  speciesCatches: number
  fishers: number
  /** Tes prises de l'espèce au spot (Itinérant uniquement). */
  persoCatches: number
}

type RpcRow = {
  id: string
  name: string
  slug: string
  department: string
  structure: string | null
  lng: number
  lat: number
  is_precise: boolean
  species_catches: number
  fishers: number
  perso_catches: number
}

export async function getTopSpotsForSpecies(
  dbKey: string,
  opts?: { dept?: string | null; limit?: number },
): Promise<TopSpot[]> {
  const supabase = await createClient()
  const limit = opts?.limit ?? 6

  // lib/types.ts ne connaît pas encore la RPC 049 (migration = fichier) → cast typé,
  // sans `any`. Le cast reste inoffensif une fois la migration appliquée + types régénérés.
  const rpc = supabase.rpc as unknown as (
    fn: 'get_top_spots_for_species',
    args: { p_species: string; p_dept: string | null; p_limit: number; p_days: number },
  ) => Promise<{ data: RpcRow[] | null; error: { message: string } | null }>

  const { data, error } = await rpc('get_top_spots_for_species', {
    p_species: dbKey,
    p_dept: opts?.dept ?? null,
    p_limit: limit,
    p_days: 90,
  })

  if (!error && data) {
    // ⚠️ r.lng / r.lat / r.is_precise (coords GATÉES par la RPC) sont volontairement
    // OMIS de TopSpot : la fiche ne montre que le lien vers le spot, jamais de coord.
    // Ne JAMAIS les forwarder au client sans repasser par le gating (anti spot-burning).
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      department: String(r.department).trim(),
      structure: r.structure,
      speciesCatches: r.species_catches,
      fishers: r.fishers,
      persoCatches: r.perso_catches,
    }))
  }

  // Repli (RPC absente / erreur) : spots publics portant l'espèce, non triés par signal.
  const { data: rows } = await supabase
    .from('spots')
    .select('id, slug, name, structure, department')
    .eq('visibility', 'public')
    .contains('species', [dbKey])
    .limit(limit)

  return (rows ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    slug: s.slug as string,
    department: String(s.department).trim(),
    structure: (s.structure as string | null) ?? null,
    speciesCatches: 0,
    fishers: 0,
    persoCatches: 0,
  }))
}
