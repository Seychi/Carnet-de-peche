import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { moderatorDeletePost, moderatorDeleteComment, dismissReport } from '@/app/actions/feed'
import { moderateApproveSpot, moderateRejectSpot, moderateMergeSpot } from '@/app/actions/spots'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'
import { Shield, Trash2, X, Check, GitMerge, MapPin } from 'lucide-react'

export const metadata = { title: 'Modération — Carnet de Pêche' }
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

type PendingSpot = {
  id: string
  name: string
  department: string
  structure: string | null
  species: string[] | null
  techniques: string[] | null
  description: string | null
  access_notes: string | null
  created_at: string
  proposer_username: string | null
}

// ---------------------------------------------------------------------------
// Server Actions wrapped pour revalidation de route
// ---------------------------------------------------------------------------
async function deletePostAction(formData: FormData) {
  'use server'
  await moderatorDeletePost(formData.get('postId') as string)
}
async function deleteCommentAction(formData: FormData) {
  'use server'
  await moderatorDeleteComment(formData.get('commentId') as string)
}
async function dismissReportAction(formData: FormData) {
  'use server'
  await dismissReport(formData.get('reportId') as string)
}
async function approveSpotAction(formData: FormData) {
  'use server'
  await moderateApproveSpot(formData.get('spotId') as string)
}
async function rejectSpotAction(formData: FormData) {
  'use server'
  await moderateRejectSpot(formData.get('spotId') as string)
}
async function mergeSpotAction(formData: FormData) {
  'use server'
  await moderateMergeSpot(formData.get('spotId') as string)
}

// ---------------------------------------------------------------------------
// Lignes
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
    <div className="flex flex-col gap-3 rounded-[14px] border border-sand-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.07em] text-coral-500">
          {reasonLabels[report.reason] ?? report.reason}
        </span>
        <span className="font-mono text-[11px] text-ink-400">{date}</span>
      </div>
      {report.post_text && (
        <p className="line-clamp-3 rounded-[8px] border border-sand-200 bg-sand-50 px-3 py-2 text-[13px] text-ink-700">
          {report.post_text}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-400">
        <span>
          Type :{' '}
          <span className="font-medium text-ink-600">
            {report.target_type === 'post' ? 'Post' : 'Commentaire'}
          </span>
        </span>
        {report.reporter_username && (
          <span>
            Signalé par : <span className="font-medium text-ink-600">@{report.reporter_username}</span>
          </span>
        )}
        {report.post_region && (
          <span>
            Département : <span className="font-mono font-medium text-ink-600">{report.post_region}</span>
          </span>
        )}
      </div>
      {report.details && <p className="text-[12px] italic text-ink-500">{report.details}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {report.target_type === 'post' ? (
          <form action={deletePostAction}>
            <input type="hidden" name="postId" value={report.target_id} />
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100"
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
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100"
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
            className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-3 py-1.5 text-[12px] font-semibold text-ink-600 transition-colors hover:bg-ink-100"
          >
            <X size={13} aria-hidden="true" />
            Ignorer
          </button>
        </form>
      </div>
    </div>
  )
}

function PendingSpotRow({ spot }: { spot: PendingSpot }) {
  const date = new Date(spot.created_at).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const dept = spot.department.trim()
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-sand-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-navy-900">
            <MapPin size={14} className="text-teal-600" aria-hidden="true" />
            {spot.name}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-400">
            {spot.structure ? (STRUCTURE_LABELS[spot.structure] ?? spot.structure) : '—'}
            {' · '}
            <span className="font-mono">{dept}</span> {DEPARTMENT_LABELS[dept] ?? ''}
          </p>
        </div>
        <span className="font-mono text-[11px] text-ink-400">{date}</span>
      </div>

      {(spot.species?.length || spot.techniques?.length) && (
        <div className="flex flex-wrap gap-1.5">
          {(spot.species ?? []).map((s) => (
            <span key={`sp-${s}`} className="rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] text-teal-700">
              {SPECIES_LABELS[s] ?? s}
            </span>
          ))}
          {(spot.techniques ?? []).map((t) => (
            <span key={`te-${t}`} className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] text-ink-600">
              {TECHNIQUE_LABELS[t] ?? t}
            </span>
          ))}
        </div>
      )}

      {spot.description && <p className="text-[13px] text-ink-600">{spot.description}</p>}
      {spot.access_notes && (
        <p className="text-[12px] italic text-ink-500">Accès : {spot.access_notes}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-400">
        {spot.proposer_username && (
          <span>
            Proposé par : <span className="font-medium text-ink-600">@{spot.proposer_username}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <form action={approveSpotAction}>
          <input type="hidden" name="spotId" value={spot.id} />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[12px] font-semibold text-teal-700 transition-colors hover:bg-teal-500/20"
          >
            <Check size={13} aria-hidden="true" />
            Approuver
          </button>
        </form>
        <form action={mergeSpotAction}>
          <input type="hidden" name="spotId" value={spot.id} />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-1.5 text-[12px] font-semibold text-ink-700 transition-colors hover:bg-gold-500/20"
          >
            <GitMerge size={13} aria-hidden="true" />
            Doublon
          </button>
        </form>
        <form action={rejectSpotAction}>
          <input type="hidden" name="spotId" value={spot.id} />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100"
          >
            <X size={13} aria-hidden="true" />
            Rejeter
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeTab = tab === 'spots' ? 'spots' : 'reports'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()
  const { data: me } = await supabase.from('profiles').select('is_moderator').eq('id', user.id).single()
  if (!me?.is_moderator) notFound()

  // Compteur de spots en attente (toujours, pour le badge d'onglet).
  const { count: pendingSpotsCount } = await supabase
    .from('spots')
    .select('id', { count: 'exact', head: true })
    .eq('moderation_status', 'pending')
    .eq('source', 'community')

  // ---- Données selon l'onglet ----
  let reports: Report[] = []
  let pendingSpots: PendingSpot[] = []

  if (activeTab === 'reports') {
    const { data: rawReports } = await supabase
      .from('reports')
      .select('id, created_at, reason, details, target_type, target_id, status, reporter_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
    const rows = rawReports ?? []

    const reporterIds = [...new Set(rows.map((r) => r.reporter_id).filter(Boolean))] as string[]
    const reporters = new Map<string, string>()
    if (reporterIds.length > 0) {
      const { data } = await supabase.from('profiles').select('id, username').in('id', reporterIds)
      for (const p of data ?? []) if (p.id && p.username) reporters.set(p.id, p.username)
    }
    const postIds = [...new Set(rows.filter((r) => r.target_type === 'post').map((r) => r.target_id))]
    const posts = new Map<string, { text: string | null; region: string | null; author_id: string }>()
    if (postIds.length > 0) {
      const { data } = await supabase.from('feed_posts').select('id, text, region, author_id').in('id', postIds)
      for (const p of data ?? []) posts.set(p.id, { text: p.text, region: p.region, author_id: p.author_id })
    }
    reports = rows.map((r) => {
      const post = r.target_type === 'post' ? posts.get(r.target_id) : undefined
      return {
        id: r.id,
        created_at: r.created_at,
        reason: r.reason,
        details: r.details,
        target_type: r.target_type,
        target_id: r.target_id,
        status: r.status,
        reporter_username: r.reporter_id ? (reporters.get(r.reporter_id) ?? null) : null,
        post_text: post?.text ?? null,
        post_region: post?.region ?? null,
        post_author_id: post?.author_id ?? null,
      }
    })
  } else {
    const { data: rawSpots } = await supabase
      .from('spots')
      .select('id, name, department, structure, species, techniques, description, access_notes, created_at, created_by')
      .eq('moderation_status', 'pending')
      .eq('source', 'community')
      .order('created_at', { ascending: false })
      .limit(50)
    const rows = rawSpots ?? []

    const proposerIds = [...new Set(rows.map((s) => s.created_by).filter(Boolean))] as string[]
    const proposers = new Map<string, string>()
    if (proposerIds.length > 0) {
      const { data } = await supabase.from('profiles').select('id, username').in('id', proposerIds)
      for (const p of data ?? []) if (p.id && p.username) proposers.set(p.id, p.username)
    }
    pendingSpots = rows.map((s) => ({
      id: s.id,
      name: s.name,
      department: s.department,
      structure: s.structure,
      species: s.species,
      techniques: s.techniques,
      description: s.description,
      access_notes: s.access_notes,
      created_at: s.created_at,
      proposer_username: s.created_by ? (proposers.get(s.created_by) ?? null) : null,
    }))
  }

  const tabCls = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
      active ? 'bg-navy-900 text-white' : 'border border-sand-200 bg-white text-ink-600 hover:border-ink-300'
    }`

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-coral-500/10">
          <Shield size={20} className="text-coral-500" aria-hidden="true" />
        </div>
        <h1 className="text-[20px] font-bold text-navy-900">Modération</h1>
      </div>

      {/* Onglets */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link href="/moderation" className={tabCls(activeTab === 'reports')}>
          Signalements
        </Link>
        <Link href="/moderation?tab=spots" className={tabCls(activeTab === 'spots')}>
          Spots en attente
          {(pendingSpotsCount ?? 0) > 0 && (
            <span className="ml-1.5 rounded-full bg-coral-500 px-1.5 py-0.5 font-mono text-[10px] text-white">
              {pendingSpotsCount}
            </span>
          )}
        </Link>
      </div>

      {activeTab === 'reports' ? (
        reports.length === 0 ? (
          <Empty label="Tout est propre, aucun signalement à traiter." />
        ) : (
          <div className="flex flex-col gap-3">
            {reports.map((r) => (
              <ReportRow key={r.id} report={r} />
            ))}
          </div>
        )
      ) : pendingSpots.length === 0 ? (
        <Empty label="Aucun spot en attente de validation." />
      ) : (
        <div className="flex flex-col gap-3">
          {pendingSpots.map((s) => (
            <PendingSpotRow key={s.id} spot={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-[14px] border border-sand-200 bg-white px-6 py-12 text-center">
      <Shield size={32} className="mx-auto mb-3 text-ink-200" aria-hidden="true" />
      <p className="text-[14px] text-ink-400">{label}</p>
    </div>
  )
}
