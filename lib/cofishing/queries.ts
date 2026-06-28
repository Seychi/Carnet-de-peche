import { createClient } from '@/lib/supabase/server'
import { neighborDepartments } from '@/lib/geo/departments'

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
  host_level: string | null
  accepted_count: number
}

export type OutingMessage = {
  id: string
  proposal_id: string
  user_id: string
  body: string
  /** Chemin dans le bucket PRIVÉ outing-photos, ou null. Jamais une URL : la lecture
   * passe par getOutingPhotoSignedUrl (gatée membership). */
  photo_path: string | null
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
 * Options (sprint 50, co-pêchage v2) :
 *  - `species` (overlap, au moins une espèce en commun) et `from` (date plancher ISO).
 *  - `includeNeighbors` : élargit le board aux départements côtiers LIMITROPHES
 *    (DEPARTMENT_ADJACENCY, frontières terrestres réelles). AUCUNE coordonnée : on
 *    n'élargit que par code de département.
 *  - `level` : ne garde que les sorties dont l'hôte a ce niveau (host_level exposé par
 *    la vue 088 : debutant / intermediaire / expert).
 *
 * Les sorties dont JE suis membre restent toujours visibles, quel que soit le filtre
 * de niveau (sinon je perdrais l'accès au chat d'une sortie que j'ai rejointe).
 */
export async function getDeptProposals(
  department: string,
  opts?: {
    species?: string[]
    from?: string
    level?: string
    includeNeighbors?: boolean
  },
): Promise<OutingProposalView[]> {
  const supabase = await createClient()
  const floor = opts?.from ?? new Date(Date.now() - 12 * 3600 * 1000).toISOString()

  // Départements ciblés : le département demandé + ses voisins côtiers si demandé.
  // AUCUNE coordonnée : on ne manipule que des codes de département.
  const departments = opts?.includeNeighbors
    ? [...new Set([department, ...neighborDepartments(department)])]
    : [department]

  // 1. Board des sorties actives (ouvertes/pleines) sur le(s) département(s) ciblé(s).
  const { data: boardData } = await supabase
    .from('outing_proposals_for_viewer')
    .select('*')
    .in('department', departments)
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
  // On mémorise ces ids pour que le filtre de niveau ne les masque jamais.
  const memberProposalIds = new Set<string>()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    // Sorties que j'héberge (sur le(s) département(s) ciblé(s)).
    const { data: hosted } = await supabase
      .from('outing_proposals')
      .select('id')
      .eq('host_id', user.id)
      .in('department', departments)
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
        .in('department', departments)
      for (const r of (extraData ?? []) as OutingProposalView[]) byId.set(r.id, r)
    }
  }

  let merged = [...byId.values()]

  // Filtre espèce (overlap) : on garde les sorties ciblant AU MOINS une des espèces.
  const wanted = opts?.species?.filter(Boolean) ?? []
  if (wanted.length > 0) {
    const set = new Set(wanted)
    merged = merged.filter((r) => (r.species ?? []).some((s) => set.has(s)))
  }

  // Filtre niveau de l'hôte (host_level exposé par la vue 088). On ne masque JAMAIS
  // une sortie dont je suis membre (sinon je perds l'accès au chat).
  const level = opts?.level?.trim()
  if (level) {
    merged = merged.filter((r) => r.host_level === level || memberProposalIds.has(r.id))
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
    .select('id, proposal_id, user_id, body, photo_path, created_at')
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

export type ReputationReview = {
  reviewerUsername: string | null
  rating: number
  comment: string | null
  createdAt: string
}

export type UserReputation = {
  /** Moyenne des notes (1-5), arrondie au dixième, ou null si aucun avis. */
  average: number | null
  count: number
  /** Avis reçus, du plus récent au plus ancien. DESCRIPTIF, jamais classant. */
  reviews: ReputationReview[]
}

/**
 * Réputation co-pêchage d'un utilisateur (sprint 50). Lit les avis REÇUS dans
 * outing_reviews (SELECT public, migration 087) : moyenne + nombre + liste détaillée
 * avec le pseudo de l'auteur de l'avis. Profils dénormalisés (anti N+1).
 *
 * DESCRIPTIF, PAS COMPÉTITIF : on rend les avis d'UN pêcheur, jamais un classement
 * entre pêcheurs (pas de « meilleur », pas de leaderboard). Aucune coordonnée.
 */
export async function getUserReputation(userId: string): Promise<UserReputation> {
  const empty: UserReputation = { average: null, count: 0, reviews: [] }
  if (!userId) return empty

  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('outing_reviews')
    .select('reviewer_id, rating, comment, created_at')
    .eq('reviewee_id', userId)
    .order('created_at', { ascending: false })
    .limit(100)

  const reviews = (rows ?? []) as {
    reviewer_id: string
    rating: number
    comment: string | null
    created_at: string
  }[]
  if (reviews.length === 0) return empty

  // Pseudos des auteurs d'avis (dénormalisés).
  const reviewerIds = [...new Set(reviews.map((r) => r.reviewer_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', reviewerIds)
  const usernameById = new Map(
    ((profiles ?? []) as { id: string; username: string | null }[]).map((p) => [p.id, p.username]),
  )

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0)
  const average = Math.round((sum / reviews.length) * 10) / 10

  return {
    average,
    count: reviews.length,
    reviews: reviews.map((r) => ({
      reviewerUsername: usernameById.get(r.reviewer_id) ?? null,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
    })),
  }
}
