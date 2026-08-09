import 'server-only'
import { createClient } from '@/lib/supabase/server'

// « Meilleurs spots pour l'espèce » de la fiche /especes (sprint 23, WS-B / D-B4).
// Appelle la RPC 049 get_top_spots_for_species (tri par signal réel de l'espèce + gating
// coords). Si la RPC renvoie une erreur (p.ex. pas encore en base), on REPLIE proprement
// sur une requête simple `contains(species)` — la fiche ne casse jamais.

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

/**
 * Nombre TOTAL de spots publiés portant l'espèce (sprint 75, Bloc 3) — alimente le
 * lien « voir les N spots ». Compte only (`head: true`), donc une requête légère.
 *
 * ⚠️ Passe par la RLS (client de session, pas la RPC definer) : elle restreint déjà
 * `anon` aux spots approuvés, donc ce compteur est cohérent avec ce que la landing
 * `/spots?species=` affichera réellement. Annoncer un nombre que la page suivante
 * ne montre pas serait pire que de ne rien annoncer.
 */
export async function countSpotsForSpecies(dbKey: string): Promise<number> {
  try {
    const supabase = await createClient()
    const { count, error } = await supabase
      .from('spots')
      .select('id', { count: 'exact', head: true })
      .eq('visibility', 'public')
      .contains('species', [dbKey])
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export async function getTopSpotsForSpecies(
  dbKey: string,
  opts?: { dept?: string | null; limit?: number },
): Promise<TopSpot[]> {
  const supabase = await createClient()
  const limit = opts?.limit ?? 6

  // Appel DIRECT (méthode bindée à son instance) — surtout PAS `const rpc = supabase.rpc`
  // qui détache `this` et casse à l'exécution (« Cannot read properties of undefined »).
  // Le client createClient() n'a pas le générique <Database> → on caste le retour
  // (même pattern que fetchQualityCells).
  const { data, error } = await supabase.rpc('get_top_spots_for_species', {
    p_species: dbKey,
    p_dept: opts?.dept ?? undefined,
    p_limit: limit,
    p_days: 90,
  })

  if (!error && data) {
    // ⚠️ lng / lat / is_precise (coords GATÉES par la RPC) sont volontairement OMIS de
    // TopSpot : la fiche ne montre que le lien vers le spot, jamais de coord. Ne jamais
    // les forwarder au client sans repasser par le gating (anti spot-burning).
    return (data as RpcRow[]).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      department: String(r.department).trim(),
      structure: r.structure ?? null,
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
