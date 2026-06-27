import { createClient } from '@/lib/supabase/server'

// Liste des sorties perso de l'utilisateur courant, avec un résumé des prises
// rattachées (nombre, meilleure prise, espèces distinctes). Sert la page
// /carnet/sorties (liste partageable).
//
// Invariants :
//  - owner-scope STRICT (auth.uid()) + RLS outings_select_own : aucune sortie d'autrui.
//  - lecture des prises TOUJOURS via catches_for_viewer (jamais la table catches),
//    filtrée user_id + outing_id non null (la vue expose outing_id depuis 063).
//  - aucune coordonnée : les sorties n'en portent pas (département seulement),
//    et on ne lit que species / size_cm côté prises.

export type OutingBest = { species: string | null; size_cm: number | null }

export type OutingListItem = {
  id: string
  started_at: string
  ended_at: string | null
  department: string
  technique: string | null
  species_targeted: string[] | null
  catchCount: number
  bestCatch: OutingBest | null
  species: string[]
  blank: boolean
}

/**
 * Toutes MES sorties (les plus récentes d'abord), chacune enrichie du résumé de
 * ses prises. Deux requêtes owner-scopées (sorties + prises rattachées), puis
 * agrégation en mémoire — pas de N+1.
 */
export async function listMyOutings(): Promise<OutingListItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  // 1) Mes sorties (RLS owner-only). Tri par début décroissant.
  const { data: outings, error } = await supabase
    .from('outings')
    .select('id, started_at, ended_at, department, technique, species_targeted')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })

  if (error || !outings || outings.length === 0) {
    if (error) console.error('[outings/list] outings', error.message)
    return []
  }

  // 2) Mes prises rattachées à une sortie (via la vue, owner-scopée). Une seule
  //    requête, on ne lit que ce qui sert au résumé (aucune coordonnée).
  const { data: catches, error: cErr } = await supabase
    .from('catches_for_viewer')
    .select('outing_id, species, size_cm')
    .eq('user_id', user.id)
    .not('outing_id', 'is', null)

  if (cErr) {
    console.error('[outings/list] catches', cErr.message)
    // On dégrade proprement : on renvoie les sorties sans agrégat de prises.
  }

  // 3) Agrégation en mémoire : compte, meilleure prise (plus grande taille),
  //    espèces distinctes — par outing_id.
  type Acc = { count: number; best: OutingBest | null; species: string[] }
  const byOuting = new Map<string, Acc>()
  for (const c of catches ?? []) {
    const oid = c.outing_id
    if (!oid) continue
    let acc = byOuting.get(oid)
    if (!acc) {
      acc = { count: 0, best: null, species: [] }
      byOuting.set(oid, acc)
    }
    acc.count += 1
    if (c.size_cm != null && (acc.best?.size_cm == null || c.size_cm > acc.best.size_cm)) {
      acc.best = { species: c.species, size_cm: c.size_cm }
    }
    if (c.species && !acc.species.includes(c.species)) acc.species.push(c.species)
  }

  return outings.map((o) => {
    const acc = byOuting.get(o.id)
    const catchCount = acc?.count ?? 0
    return {
      id: o.id,
      started_at: o.started_at,
      ended_at: o.ended_at,
      department: o.department,
      technique: o.technique,
      species_targeted: o.species_targeted,
      catchCount,
      bestCatch: acc?.best ?? null,
      species: acc?.species ?? [],
      blank: catchCount === 0,
    }
  })
}
