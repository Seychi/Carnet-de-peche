import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { moderatorDeletePost, moderatorDeleteComment, dismissReport } from '@/app/actions/feed'
import { Shield, Trash2, X } from 'lucide-react'

export const metadata = { title: 'Modération — Carnet de Pêche' }

// Revalider la page après chaque action de modération (dismissReport / moderatorDeletePost).
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types locaux
// ---------------------------------------------------------------------------
type Report = {
  id: string
  created_at: string
  reason: string
  details: string | null
  target_type: string
  target_id: string
  status: string
  reporter_username: string | null
  post_text: string | null
  post_region: string | null
  post_author_id: string | null
}

// ---------------------------------------------------------------------------
// Server Actions wrapped pour revalidation de route
// ---------------------------------------------------------------------------
async function deletePostAction(formData: FormData) {
  'use server'
  const postId = formData.get('postId') as string
  await moderatorDeletePost(postId)
}

async function deleteCommentAction(formData: FormData) {
  'use server'
  const commentId = formData.get('commentId') as string
  await moderatorDeleteComment(commentId)
}

async function dismissReportAction(formData: FormData) {
  'use server'
  const reportId = formData.get('reportId') as string
  await dismissReport(reportId)
}

// ---------------------------------------------------------------------------
// Composant de ligne rapport
// ---------------------------------------------------------------------------
function ReportRow({ report }: { report: Report }) {
  const date = new Date(report.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  const reasonLabels: Record<string, string> = {
    spam: 'Spam',
    inapproprie: 'Contenu inapproprié',
    spot_burning: 'Spot burning',
    autre: 'Autre',
  }

  return (
    <div className="rounded-[14px] border border-sand-200 bg-white p-4 flex flex-col gap-3">
      {/* En-tête : raison + date */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-coral-500">
          {reasonLabels[report.reason] ?? report.reason}
        </span>
        <span className="font-mono text-[11px] text-ink-400">{date}</span>
      </div>

      {/* Contenu signalé */}
      {report.post_text && (
        <p className="text-[13px] text-ink-700 line-clamp-3 bg-sand-50 rounded-[8px] px-3 py-2 border border-sand-200">
          {report.post_text}
        </p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-400">
        <span>
          Type :{' '}
          <span className="font-medium text-ink-600">
            {report.target_type === 'post' ? 'Post' : 'Commentaire'}
          </span>
        </span>
        {report.reporter_username && (
          <span>
            Signalé par :{' '}
            <span className="font-medium text-ink-600">@{report.reporter_username}</span>
          </span>
        )}
        {report.post_region && (
          <span>
            Département : <span className="font-mono font-medium text-ink-600">{report.post_region}</span>
          </span>
        )}
      </div>

      {report.details && (
        <p className="text-[12px] text-ink-500 italic">{report.details}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 flex-wrap">
        {report.target_type === 'post' ? (
          <form action={deletePostAction}>
            <input type="hidden" name="postId" value={report.target_id} />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100 border border-red-200"
            >
              <Trash2 size={13} aria-hidden="true" />
              Supprimer le post
            </button>
          </form>
        ) : (
          <form action={deleteCommentAction}>
            <input type="hidden" name="commentId" value={report.target_id} />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100 border border-red-200"
            >
              <Trash2 size={13} aria-hidden="true" />
              Supprimer le commentaire
            </button>
          </form>
        )}

        <form action={dismissReportAction}>
          <input type="hidden" name="reportId" value={report.id} />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg bg-ink-50 px-3 py-1.5 text-[12px] font-semibold text-ink-600 transition-colors hover:bg-ink-100 border border-ink-200"
          >
            <X size={13} aria-hidden="true" />
            Ignorer
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------
export default async function ModerationPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Gate serveur — jamais client-only.
  if (!user) notFound()
  const { data: me } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', user.id)
    .single()
  if (!me?.is_moderator) notFound()

  // Lecture des signalements pending.
  // reports n'a pas de FK déclarée vers feed_posts → deux requêtes séquentielles
  // pour éviter un join non supporté par PostgREST sur target_id générique.
  const { data: rawReports, error } = await supabase
    .from('reports')
    .select('id, created_at, reason, details, target_type, target_id, status, reporter_id')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[moderation:fetch]', error.message)
  }

  const reports = rawReports ?? []

  // Enrichissement : usernames des reporters
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id).filter(Boolean))] as string[]
  const reportersMap = new Map<string, string>()
  if (reporterIds.length > 0) {
    const { data: reporters } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', reporterIds)
    for (const p of reporters ?? []) {
      if (p.id && p.username) reportersMap.set(p.id, p.username)
    }
  }

  // Enrichissement : texte + region + author_id des posts signalés
  const postIds = [
    ...new Set(reports.filter((r) => r.target_type === 'post').map((r) => r.target_id)),
  ]
  const postsMap = new Map<string, { text: string | null; region: string | null; author_id: string }>()
  if (postIds.length > 0) {
    const { data: posts } = await supabase
      .from('feed_posts')
      .select('id, text, region, author_id')
      .in('id', postIds)
    for (const p of posts ?? []) {
      postsMap.set(p.id, { text: p.text, region: p.region, author_id: p.author_id })
    }
  }

  const enriched: Report[] = reports.map((r) => {
    const post = r.target_type === 'post' ? postsMap.get(r.target_id) : undefined
    return {
      id: r.id,
      created_at: r.created_at,
      reason: r.reason,
      details: r.details,
      target_type: r.target_type,
      target_id: r.target_id,
      status: r.status,
      reporter_username: r.reporter_id ? (reportersMap.get(r.reporter_id) ?? null) : null,
      post_text: post?.text ?? null,
      post_region: post?.region ?? null,
      post_author_id: post?.author_id ?? null,
    }
  })

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
      {/* En-tête */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-coral-500/10">
          <Shield size={20} className="text-coral-500" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-[20px] font-bold text-navy-900">Modération</h1>
          <p className="text-[13px] text-ink-400">
            {enriched.length === 0
              ? 'Aucun signalement en attente.'
              : `${enriched.length} signalement${enriched.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>
      </div>

      {/* Liste */}
      {enriched.length === 0 ? (
        <div className="rounded-[14px] border border-sand-200 bg-white px-6 py-12 text-center">
          <Shield size={32} className="mx-auto mb-3 text-ink-200" aria-hidden="true" />
          <p className="text-[14px] text-ink-400">Tout est propre, aucun signalement à traiter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {enriched.map((report) => (
            <ReportRow key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  )
}
