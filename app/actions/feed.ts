'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isCoastalDepartment } from '@/lib/geo/departments'
import type { FeedPost, FeedTab } from '@/lib/feed/types'
import '@/lib/zod-config'
import { z } from 'zod'

// Résultat uniformisé de toutes les actions du fil.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const AUTH_MSG = 'Connecte-toi pour participer au fil.'

// Garde-fous anti-spam (social 100% gratuit depuis la migration 022) :
// le même plafond est appliqué en backstop par les triggers DB
// feed_posts_rate_limit / feed_comments_rate_limit.
const MAX_POSTS_PER_24H = 10
const MAX_COMMENTS_PER_24H = 50
const POST_LIMIT_MSG =
  'Doucement moussaillon : 10 posts en 24h, c’est le max. Reviens demain 🎣'
const COMMENT_LIMIT_MSG =
  'Doucement moussaillon : 50 commentaires en 24h, c’est le max. Reviens demain 🎣'

// Compte les lignes écrites par l'utilisateur sur les dernières 24h.
async function countLast24h(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'feed_posts' | 'feed_comments',
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('author_id', userId)
    .gte('created_at', since)
  return count ?? 0
}

function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.'
}

// ---------------------------------------------------------------------------
// Filtre anti-spam minimal (sprint 10.6 WS B) — le rate-limit 022 ne filtre
// que la fréquence : un post arnaque « gift cards » est passé (audit 2026-06-11).
// Heuristiques volontairement étroites pour éviter les faux positifs : un post
// avec UN lien (article météo…) passe.
// ---------------------------------------------------------------------------
const SPAM_MSG =
  'Ton message ressemble à du spam. Si c’est une erreur, reformule sans lien ni code promo.'

const SPAM_PATTERNS: RegExp[] = [
  /gift\s*card/i,
  /coupon\s*code/i,
  /promo\s*code/i,
  /whatsapp\s*\+?\d/i,
  /telegram\s*@/i,
  // Suites type code promo : OP-SBNG-TFBC (majuscules volontaires, pas de /i —
  // sinon les mots composés français matcheraient)
  /\b[A-Z]{2,}-[A-Z0-9]{4}(-[A-Z0-9]{4})+\b/,
]

/** Retourne un message d'erreur si le texte ressemble à du spam, sinon null. */
function spamCheck(text: string): string | null {
  const urlCount = (text.match(/https?:\/\/|\bwww\./gi) ?? []).length
  if (urlCount > 1) return SPAM_MSG
  if (SPAM_PATTERNS.some((re) => re.test(text))) return SPAM_MSG
  return null
}

// Revalide le fil global + le fil du département concerné.
function revalidateFeed(region?: string | null) {
  revalidatePath('/fil')
  if (region) revalidatePath(`/fil/${region}`)
}

// ---------------------------------------------------------------------------
// createPost — texte libre et/ou partage d'une prise du carnet
// ---------------------------------------------------------------------------
const createPostSchema = z.object({
  text: z.string().max(2000, 'Ton message ne peut pas dépasser 2000 caractères.').optional(),
  catchId: z.string().uuid('Prise invalide.').optional(),
  region: z
    .string()
    .refine(isCoastalDepartment, 'Ce département côtier n’est pas reconnu.'),
})

export async function createPost(input: {
  text?: string
  catchId?: string
  region: string
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  const parsed = createPostSchema.safeParse(input)
  if (!parsed.success) return fail(firstZodError(parsed.error))

  const { region, catchId } = parsed.data
  const text = parsed.data.text?.trim() || undefined
  if (!text && !catchId) return fail('Écris un message ou partage une prise.')

  if (text) {
    const spamError = spamCheck(text)
    if (spamError) return fail(spamError)
  }

  // Rate-limit anti-spam (le trigger DB feed_posts_rate_limit est le backstop).
  if ((await countLast24h(supabase, 'feed_posts', user.id)) >= MAX_POSTS_PER_24H) {
    return fail(POST_LIMIT_MSG)
  }

  // Si on partage une prise, elle doit appartenir à l'auteur.
  if (catchId) {
    const { data: own } = await supabase
      .from('catches')
      .select('id')
      .eq('id', catchId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!own) return fail('Cette prise ne t’appartient pas.')
  }

  const { data: post, error } = await supabase
    .from('feed_posts')
    .insert({ author_id: user.id, text: text ?? null, catch_id: catchId ?? null, region })
    .select('id')
    .single()

  if (error || !post) {
    if (error?.message.includes('rate_limit_posts')) return fail(POST_LIMIT_MSG)
    console.error('[createPost]', error?.message)
    return fail('Impossible de publier ton post. Réessaie.')
  }

  revalidateFeed(region)
  return ok({ id: post.id })
}

// ---------------------------------------------------------------------------
// toggleLike — like / unlike cohérent
// ---------------------------------------------------------------------------
export async function toggleLike(postId: string): Promise<ActionResult<{ liked: boolean }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  if (!z.string().uuid().safeParse(postId).success) return fail('Post invalide.')

  const { data: post } = await supabase
    .from('feed_posts')
    .select('region')
    .eq('id', postId)
    .maybeSingle()
  if (!post) return fail('Post introuvable.')

  const { data: existing } = await supabase
    .from('feed_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('feed_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
    if (error) {
      console.error('[toggleLike:delete]', error.message)
      return fail('Impossible de retirer ton like. Réessaie.')
    }
    revalidateFeed(post.region)
    return ok({ liked: false })
  }

  const { error } = await supabase
    .from('feed_likes')
    .insert({ post_id: postId, user_id: user.id })
  if (error) {
    console.error('[toggleLike:insert]', error.message)
    return fail('Impossible d’aimer ce post. Réessaie.')
  }
  revalidateFeed(post.region)
  return ok({ liked: true })
}

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------
const commentSchema = z
  .string()
  .trim()
  .min(1, 'Ton commentaire est vide.')
  .max(1000, 'Ton commentaire ne peut pas dépasser 1000 caractères.')

export async function addComment(
  postId: string,
  text: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  if (!z.string().uuid().safeParse(postId).success) return fail('Post invalide.')
  const parsedText = commentSchema.safeParse(text)
  if (!parsedText.success) return fail(firstZodError(parsedText.error))

  const spamError = spamCheck(parsedText.data)
  if (spamError) return fail(spamError)

  const { data: post } = await supabase
    .from('feed_posts')
    .select('region')
    .eq('id', postId)
    .maybeSingle()
  if (!post) return fail('Post introuvable.')

  // Rate-limit anti-spam (le trigger DB feed_comments_rate_limit est le backstop).
  if ((await countLast24h(supabase, 'feed_comments', user.id)) >= MAX_COMMENTS_PER_24H) {
    return fail(COMMENT_LIMIT_MSG)
  }

  const { data: comment, error } = await supabase
    .from('feed_comments')
    .insert({ post_id: postId, author_id: user.id, text: parsedText.data })
    .select('id')
    .single()

  if (error || !comment) {
    if (error?.message.includes('rate_limit_comments')) return fail(COMMENT_LIMIT_MSG)
    console.error('[addComment]', error?.message)
    return fail('Impossible d’envoyer ton commentaire. Réessaie.')
  }

  revalidateFeed(post.region)
  return ok({ id: comment.id })
}

// ---------------------------------------------------------------------------
// deletePost — RLS l'assure aussi, mais on double-check par author_id
// ---------------------------------------------------------------------------
export async function deletePost(postId: string): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  if (!z.string().uuid().safeParse(postId).success) return fail('Post invalide.')

  const { data: deleted, error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)
    .select('id, region')

  if (error) {
    console.error('[deletePost]', error.message)
    return fail('Impossible de supprimer ce post. Réessaie.')
  }
  if (!deleted || deleted.length === 0) return fail('Post introuvable ou pas à toi.')

  revalidateFeed(deleted[0].region)
  return ok({ id: postId })
}

// ---------------------------------------------------------------------------
// deleteComment
// ---------------------------------------------------------------------------
export async function deleteComment(commentId: string): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  if (!z.string().uuid().safeParse(commentId).success) return fail('Commentaire invalide.')

  const { data: deleted, error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', user.id)
    .select('id')

  if (error) {
    console.error('[deleteComment]', error.message)
    return fail('Impossible de supprimer ce commentaire. Réessaie.')
  }
  if (!deleted || deleted.length === 0) return fail('Commentaire introuvable ou pas à toi.')

  revalidateFeed()
  return ok({ id: commentId })
}

// ---------------------------------------------------------------------------
// Modération (sprint 10.6 WS B) — suppression par un modérateur flaggé
// profiles.is_moderator (migration 023). Chaque suppression laisse une trace
// dans reports (status resolved) et résout les signalements en attente.
// ---------------------------------------------------------------------------
const NOT_MODERATOR_MSG = 'Action réservée aux modérateurs.'

async function viewerIsModerator(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_moderator === true
}

// Trace d'audit + résolution des signalements en attente sur la cible.
async function resolveReportsForTarget(
  supabase: Awaited<ReturnType<typeof createClient>>,
  moderatorId: string,
  targetType: 'post' | 'comment',
  targetId: string,
) {
  const now = new Date().toISOString()
  const { error: auditError } = await supabase.from('reports').insert({
    reporter_id: moderatorId,
    target_type: targetType,
    target_id: targetId,
    reason: 'spam',
    details: 'Supprimé par modération.',
    status: 'resolved',
    resolved_by: moderatorId,
    resolved_at: now,
  })
  if (auditError) {
    // Non bloquant (le contenu est déjà supprimé) mais jamais silencieux.
    console.error('[moderation:audit]', auditError.message)
  }
  const { error: resolveError } = await supabase
    .from('reports')
    .update({ status: 'resolved', resolved_by: moderatorId, resolved_at: now })
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('status', 'pending')
  if (resolveError) {
    console.error('[moderation:resolve]', resolveError.message)
  }
}

export async function moderatorDeletePost(
  postId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  if (!z.string().uuid().safeParse(postId).success) return fail('Post invalide.')
  if (!(await viewerIsModerator(supabase, user.id))) return fail(NOT_MODERATOR_MSG)

  const { data: deleted, error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', postId)
    .select('id, region')

  if (error) {
    console.error('[moderatorDeletePost]', error.message)
    return fail('Impossible de supprimer ce post. Réessaie.')
  }
  if (!deleted || deleted.length === 0) return fail('Post introuvable.')

  await resolveReportsForTarget(supabase, user.id, 'post', postId)
  revalidateFeed(deleted[0].region)
  return ok({ id: postId })
}

export async function moderatorDeleteComment(
  commentId: string,
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  if (!z.string().uuid().safeParse(commentId).success) return fail('Commentaire invalide.')
  if (!(await viewerIsModerator(supabase, user.id))) return fail(NOT_MODERATOR_MSG)

  const { data: deleted, error } = await supabase
    .from('feed_comments')
    .delete()
    .eq('id', commentId)
    .select('id')

  if (error) {
    console.error('[moderatorDeleteComment]', error.message)
    return fail('Impossible de supprimer ce commentaire. Réessaie.')
  }
  if (!deleted || deleted.length === 0) return fail('Commentaire introuvable.')

  await resolveReportsForTarget(supabase, user.id, 'comment', commentId)
  revalidateFeed()
  return ok({ id: commentId })
}

// ---------------------------------------------------------------------------
// reportPost — signalement (modération libre au lancement)
// ---------------------------------------------------------------------------
const REPORT_REASONS = ['spam', 'inapproprie', 'spot_burning', 'autre'] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000, 'Ta précision est trop longue (max 1000).').optional(),
})

export async function reportPost(
  postId: string,
  reason: ReportReason,
  details?: string,
): Promise<ActionResult<undefined>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  if (!z.string().uuid().safeParse(postId).success) return fail('Post invalide.')
  const parsed = reportSchema.safeParse({ reason, details })
  if (!parsed.success) return fail(firstZodError(parsed.error))

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: 'post',
    target_id: postId,
    reason: parsed.data.reason,
    details: parsed.data.details ?? null,
  })

  if (error) {
    console.error('[reportPost]', error.message)
    return fail('Impossible d’envoyer ton signalement. Réessaie.')
  }

  // Alerte volume : > 3 signalements sur le même post → log (Sentry au sprint 11).
  const { count } = await supabase
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', 'post')
    .eq('target_id', postId)
  if ((count ?? 0) > 3) {
    console.warn(`[reportPost] post ${postId} a ${count} signalements — à modérer.`)
  }

  return ok(undefined)
}

// ---------------------------------------------------------------------------
// getComments — lecture paginée des commentaires d'un post (avec auteur).
// Deux étapes : feed_comments référence auth.users, pas profiles → pas d'embed.
// ---------------------------------------------------------------------------
export type FeedComment = {
  id: string
  text: string
  created_at: string
  author_id: string
  author_username: string | null
  author_display_name: string | null
  author_avatar_url: string | null
}

export async function getComments(
  postId: string,
  offset = 0,
  limit = 10,
): Promise<ActionResult<FeedComment[]>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)
  if (!z.string().uuid().safeParse(postId).success) return fail('Post invalide.')

  const { data: rows, error } = await supabase
    .from('feed_comments')
    .select('id, text, created_at, author_id')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[getComments]', error.message)
    return fail('Impossible de charger les commentaires.')
  }

  const comments = (rows ?? []) as {
    id: string
    text: string
    created_at: string
    author_id: string
  }[]
  if (comments.length === 0) return ok([])

  const authorIds = [...new Set(comments.map((c) => c.author_id))]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', authorIds)

  const byId = new Map(
    (profiles ?? []).map((p: { id: string } & Record<string, unknown>) => [p.id, p]),
  )

  const result: FeedComment[] = comments.map((c) => {
    const a = byId.get(c.author_id) as
      | { username: string | null; display_name: string | null; avatar_url: string | null }
      | undefined
    return {
      id: c.id,
      text: c.text,
      created_at: c.created_at,
      author_id: c.author_id,
      author_username: a?.username ?? null,
      author_display_name: a?.display_name ?? null,
      author_avatar_url: a?.avatar_url ?? null,
    }
  })
  return ok(result)
}

// ---------------------------------------------------------------------------
// getFeedPage — page de posts (20) selon l'onglet, avec URLs photos signées.
//   tab 'dept' : posts du département `region`
//   tab 'all'  : tous départements (réservé itinerant côté UI)
//   tab 'follows' : posts des pêcheurs que je suis
// Pagination par curseur created_at (desc).
// ---------------------------------------------------------------------------
const PAGE_SIZE = 20

export type FeedPostEnriched = FeedPost & { catchPhotoUrl: string | null }

export async function getFeedPage(params: {
  tab: FeedTab
  region: string
  cursor?: string
}): Promise<ActionResult<{ posts: FeedPostEnriched[]; nextCursor: string | null }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail(AUTH_MSG)

  let query = supabase
    .from('feed_posts_for_viewer')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (params.tab === 'dept') {
    query = query.eq('region', params.region)
  } else if (params.tab === 'follows') {
    const { data: following } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    const ids = (following ?? []).map((f) => f.following_id)
    if (ids.length === 0) return ok({ posts: [], nextCursor: null })
    query = query.in('author_id', ids)
  }
  // tab 'all' : aucun filtre de département

  if (params.cursor) query = query.lt('created_at', params.cursor)

  const { data, error } = await query
  if (error) {
    console.error('[getFeedPage]', error.message)
    return fail('Impossible de charger le fil.')
  }

  const posts = (data ?? []) as FeedPost[]

  // URLs signées des photos de prise (bucket privé catches).
  const paths = posts
    .map((p) => p.catch_photo_path)
    .filter((p): p is string => Boolean(p))
  const signedByPath = new Map<string, string>()
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage.from('catches').createSignedUrls(paths, 3600)
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl)
    }
  }

  // « Je suis déjà l'auteur ? » en UNE requête follows par page (Bloc C — pas de N+1).
  // Auteurs distincts ≠ moi. Sur l'onglet 'follows' tous sont suivis par définition,
  // mais la requête reste correcte (et O(1)) → pas de branchement spécial.
  const authorIds = [
    ...new Set(
      posts.map((p) => p.author_id).filter((id): id is string => Boolean(id) && id !== user.id),
    ),
  ]
  const followingSet = new Set<string>()
  if (authorIds.length > 0) {
    const { data: frows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', authorIds)
    for (const r of frows ?? []) followingSet.add(r.following_id)
  }

  const enriched: FeedPostEnriched[] = posts.map((p) => ({
    ...p,
    author_is_following: p.author_id ? followingSet.has(p.author_id) : false,
    catchPhotoUrl: p.catch_photo_path ? (signedByPath.get(p.catch_photo_path) ?? null) : null,
  }))

  const nextCursor =
    enriched.length === PAGE_SIZE ? (enriched[enriched.length - 1].created_at ?? null) : null

  return ok({ posts: enriched, nextCursor })
}
