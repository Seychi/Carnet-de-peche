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
 * Sorties d'un département via la vue (aucun geom). `species` est désormais porté par
 * la vue (migration 076) : une seule requête, fini le contournement 2-requêtes.
 *
 * Le board affiche les sorties ENCORE actives (`open`/`full`). En plus, les sorties
 * dont l'utilisateur courant est MEMBRE (hôte ou participant accepté), notamment celles
 * annulées ou passées, restent visibles (grisées) pour qu'il garde l'accès au chat en
 * lecture seule. Un tiers ne voit jamais une sortie annulée (il n'en est pas membre).
 *
 * Filtres optionnels : `species` (overlap, au moins une espèce en commun) et `from`
 * (date plancher ISO).
 */
export async function getDeptProposals(
  department: string,
  filters?: { species?: string[]; from?: string },
): Promise<OutingProposalView[]> {
  const supabase = await createClient()
  const floor = filters?.from ?? new Date(Date.now() - 12 * 3600 * 1000).toISOString()

  // 1. Board des sorties actives (ouvertes/pleines).
  const { data: boardData } = await supabase
    .from('outing_proposals_for_viewer')
    .select('*')
    .eq('department', department)
    .in('status', ['open', 'full'])
    .gte('planned_at', floor)
    .order('planned_at', { ascending: true })
    .limit(50)

  const byId = new Map<string, OutingProposalView>()
  for (const r of (boardData ?? []) as OutingProposalView[]) byId.set(r.id, r)

  // 2. Sorties dont JE suis MEMBRE (hôte ou participant accepté) qui ne sont pas déjà
  // sur le board : annulées/passées surtout, mais aussi une active aux dates ayant
  // glissé sous le plancher. Elles restent visibles (grisées si closes) pour garder
  // l'accès au chat. Un tiers n'obtient jamais ces sorties (il n'est pas membre).
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const memberProposalIds = new Set<string>()

    // Sorties que j'héberge.
    const { data: hosted } = await supabase
      .from('outing_proposals')
      .select('id')
      .eq('host_id', user.id)
      .eq('department', department)
    for (const r of (hosted ?? []) as { id: string }[]) memberProposalIds.add(r.id)

    // Sorties où ma participation est acceptée.
    const { data: parts } = await supabase
      .from('outing_participants')
      .select('proposal_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted')
    for (const r of (parts ?? []) as { proposal_id: string }[]) memberProposalIds.add(r.proposal_id)

    const extraIds = [...memberProposalIds].filter((id) => !byId.has(id))
    if (extraIds.length > 0) {
      const { data: extraData } = await supabase
        .from('outing_proposals_for_viewer')
        .select('*')
        .in('id', extraIds)
        .eq('department', department)
      for (const r of (extraData ?? []) as OutingProposalView[]) byId.set(r.id, r)
    }
  }

  let merged = [...byId.values()]

  // Filtre espèce (overlap) : on garde les sorties ciblant AU MOINS une des espèces.
  const wanted = filters?.species?.filter(Boolean) ?? []
  if (wanted.length > 0) {
    const set = new Set(wanted)
    merged = merged.filter((r) => (r.species ?? []).some((s) => set.has(s)))
  }

  // Actives d'abord (planned_at croissant), closes ensuite (les plus récentes en tête).
  const isClosed = (s: string) => s === 'cancelled' || s === 'done'
  merged.sort((a, b) => {
    const ca = isClosed(a.status) ? 1 : 0
    const cb = isClosed(b.status) ? 1 : 0
    if (ca !== cb) return ca - cb
    const ta = new Date(a.planned_at).getTime()
    const tb = new Date(b.planned_at).getTime()
    return ca === 1 ? tb - ta : ta - tb
  })

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
