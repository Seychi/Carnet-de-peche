import { createClient } from '@/lib/supabase/server'

export type OutingProposalView = {
  id: string
  host_id: string
  department: string
  area_label: string | null
  planned_at: string
  capacity: number | null
  status: string
  notes: string | null
  species: string[] | null
  host_username: string | null
  host_display_name: string | null
  host_avatar_url: string | null
  accepted_count: number
}

export type OutingMessage = {
  id: string
  proposal_id: string
  user_id: string
  body: string
  created_at: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

export type ParticipantWithProfile = {
  user_id: string
  status: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

/**
 * Sorties à venir d'un département (ouvertes/pleines), via la vue (aucun geom).
 * Filtres optionnels : `species` (overlap, au moins une espèce en commun) et `from`
 * (date plancher ISO). La vue ne porte pas la colonne `species` (068 l'a ajoutée à la
 * table, pas à la vue) → on la lit sur la table `outing_proposals` et on la fusionne.
 */
export async function getDeptProposals(
  department: string,
  filters?: { species?: string[]; from?: string },
): Promise<OutingProposalView[]> {
  const supabase = await createClient()
  const floor = filters?.from ?? new Date(Date.now() - 12 * 3600 * 1000).toISOString()

  const { data } = await supabase
    .from('outing_proposals_for_viewer')
    .select('*')
    .eq('department', department)
    .in('status', ['open', 'full'])
    .gte('planned_at', floor)
    .order('planned_at', { ascending: true })
    .limit(50)

  const rows = (data ?? []) as Omit<OutingProposalView, 'species'>[]
  if (rows.length === 0) return []

  // Espèces depuis la table (la vue ne les expose pas). RLS SELECT = authentifié (053).
  const ids = rows.map((r) => r.id)
  const { data: speciesRows } = await supabase
    .from('outing_proposals')
    .select('id, species')
    .in('id', ids)
  const speciesById = new Map(
    ((speciesRows ?? []) as { id: string; species: string[] | null }[]).map((s) => [s.id, s.species]),
  )

  let merged: OutingProposalView[] = rows.map((r) => ({
    ...r,
    species: speciesById.get(r.id) ?? null,
  }))

  // Filtre espèce (overlap) : on garde les sorties ciblant AU MOINS une des espèces.
  const wanted = filters?.species?.filter(Boolean) ?? []
  if (wanted.length > 0) {
    const set = new Set(wanted)
    merged = merged.filter((r) => (r.species ?? []).some((s) => set.has(s)))
  }

  return merged
}

/**
 * Historique du chat d'une sortie (trié par date). La RLS (068) ne renvoie de lignes
 * qu'à l'hôte et aux participants `accepted` → un tiers obtient une liste vide.
 * Profils dénormalisés pour l'affichage (anti N+1).
 */
export async function getOutingMessages(proposalId: string): Promise<OutingMessage[]> {
  const supabase = await createClient()
  const { data: msgs } = await supabase
    .from('outing_messages')
    .select('id, proposal_id, user_id, body, created_at')
    .eq('proposal_id', proposalId)
    .order('created_at', { ascending: true })
    .limit(200)
  const rows = (msgs ?? []) as Omit<OutingMessage, 'username' | 'display_name' | 'avatar_url'>[]
  if (rows.length === 0) return []

  const ids = [...new Set(rows.map((r) => r.user_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids)
  const byId = new Map(
    ((profiles ?? []) as { id: string; username: string | null; display_name: string | null; avatar_url: string | null }[]).map(
      (p) => [p.id, p],
    ),
  )
  return rows.map((r) => {
    const p = byId.get(r.user_id)
    return {
      ...r,
      username: p?.username ?? null,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    }
  })
}

/** Statut de participation de l'utilisateur courant pour des propositions données. */
export async function getMyParticipationMap(proposalIds: string[]): Promise<Record<string, string>> {
  if (proposalIds.length === 0) return {}
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return {}
  const { data } = await supabase
    .from('outing_participants')
    .select('proposal_id, status')
    .eq('user_id', user.id)
    .in('proposal_id', proposalIds)
  const map: Record<string, string> = {}
  for (const r of (data ?? []) as { proposal_id: string; status: string }[]) {
    map[r.proposal_id] = r.status
  }
  return map
}

/** Participants d'une sortie (réservé à l'hôte par la RLS) + profils dénormalisés. */
export async function getProposalParticipants(proposalId: string): Promise<ParticipantWithProfile[]> {
  const supabase = await createClient()
  const { data: parts } = await supabase
    .from('outing_participants')
    .select('user_id, status')
    .eq('proposal_id', proposalId)
  const rows = (parts ?? []) as { user_id: string; status: string }[]
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.user_id)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids)
  const byId = new Map(
    ((profiles ?? []) as { id: string; username: string | null; display_name: string | null; avatar_url: string | null }[]).map(
      (p) => [p.id, p],
    ),
  )
  return rows.map((r) => {
    const p = byId.get(r.user_id)
    return {
      user_id: r.user_id,
      status: r.status,
      username: p?.username ?? null,
      display_name: p?.display_name ?? null,
      avatar_url: p?.avatar_url ?? null,
    }
  })
}
