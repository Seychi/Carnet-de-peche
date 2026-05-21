'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isCoastalDepartment } from '@/lib/geo/coastal-departments'
import '@/lib/zod-config'
import { z } from 'zod'

// Résultat uniformisé de toutes les actions du fil.
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data })
const fail = (error: string): ActionResult<never> => ({ ok: false, error })

const TIER_MSG =
  'Tu ne peux pas écrire ici. Passe en Local pour participer au fil de ton département.'
const AUTH_MSG = 'Connecte-toi pour participer au fil.'

function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides.'
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

  // Ceinture + bretelles : check tier explicite (le RLS le bloque déjà côté DB).
  const { data: canPost } = await supabase.rpc('can_post_in_department', { dept: region })
  if (!canPost) return fail(TIER_MSG)

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

  const { data: canPost } = await supabase.rpc('can_post_in_department', { dept: post.region })
  if (!canPost) return fail(TIER_MSG)

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

  const { data: post } = await supabase
    .from('feed_posts')
    .select('region')
    .eq('id', postId)
    .maybeSingle()
  if (!post) return fail('Post introuvable.')

  const { data: canPost } = await supabase.rpc('can_post_in_department', { dept: post.region })
  if (!canPost) return fail(TIER_MSG)

  const { data: comment, error } = await supabase
    .from('feed_comments')
    .insert({ post_id: postId, author_id: user.id, text: parsedText.data })
    .select('id')
    .single()

  if (error || !comment) {
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
