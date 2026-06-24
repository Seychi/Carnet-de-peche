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
  host_username: string | null
  host_display_name: string | null
  host_avatar_url: string | null
  accepted_count: number
}

export type ParticipantWithProfile = {
  user_id: string
  status: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

/** Sorties à venir d'un département (ouvertes/pleines), via la vue (aucun geom). */
export async function getDeptProposals(department: string): Promise<OutingProposalView[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('outing_proposals_for_viewer')
    .select('*')
    .eq('department', department)
    .in('status', ['open', 'full'])
    .gte('planned_at', new Date(Date.now() - 12 * 3600 * 1000).toISOString())
    .order('planned_at', { ascending: true })
    .limit(50)
  return (data ?? []) as OutingProposalView[]
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
