import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { moderatorDeletePost, moderatorDeleteComment, dismissReport } from '@/app/actions/feed'
import {
  moderateApproveSpot,
  moderateRejectSpot,
  moderateMergeSpot,
  moderateVerifySpot,
  moderateReverifySpot,
} from '@/app/actions/spots'
import { SPOT_REPORT_REASON_LABELS } from '@/lib/spots/report-reasons'
import { SPECIES_LABELS, TECHNIQUE_LABELS, STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS, COASTAL_DEPARTMENTS } from '@/lib/geo/departments'
import ImportsCurationList from '@/components/spots/ImportsCurationList'
import type { ImportToCurate } from '@/components/spots/CurateSpotForm'
import { Shield, Trash2, X, Check, GitMerge, MapPin, BadgeCheck, Anchor, RotateCw } from 'lucide-react'

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
  // Contexte spot (sprint 48) : pour les reports target_type='spot'.
  spot_name: string | null
  spot_slug: string | null
  spot_department: string | null
}

// Ligne de la vue « Re-vérifier » (tous les spots, pas seulement les pending).
type ReverifySpot = {
  id: string
  name: string
  slug: string
  department: string
  source: string
  moderation_status: string
  verified: boolean
  verified_at: string | null
  verification_level: string | null
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
async function verifySpotAction(formData: FormData) {
  'use server'
  await moderateVerifySpot(formData.get('spotId') as string)
}
async function reverifySpotAction(formData: FormData) {
  'use server'
  await moderateReverifySpot(formData.get('spotId') as string)
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
  // Libellés de raison : fil (post/commentaire) + spot (sprint 48).
  const reasonLabels: Record<string, string> = {
    spam: 'Spam',
    inapproprie: 'Contenu inapproprié',
    spot_burning: 'Spot burning',
    ...SPOT_REPORT_REASON_LABELS,
    autre: 'Autre',
  }
  const typeLabel =
    report.target_type === 'post'
      ? 'Post'
      : report.target_type === 'spot'
        ? 'Spot'
        : 'Commentaire'
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
      {/* Contexte spot : nom + lien vers la fiche (aucune coordonnée). */}
      {report.target_type === 'spot' && report.spot_name && (
        <p className="inline-flex items-center gap-1.5 rounded-[8px] border border-sand-200 bg-sand-50 px-3 py-2 text-[13px] font-medium text-navy-900">
          <MapPin size={14} className="text-teal-600" aria-hidden="true" />
          {report.spot_slug ? (
            <Link href={`/spots/${report.spot_slug}`} className="underline-offset-2 hover:underline">
              {report.spot_name}
            </Link>
          ) : (
            report.spot_name
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-400">
        <span>
          Type : <span className="font-medium text-ink-600">{typeLabel}</span>
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
        {report.target_type === 'spot' && report.spot_department && (
          <span>
            Département :{' '}
            <span className="font-mono font-medium text-ink-600">{report.spot_department.trim()}</span>{' '}
            {DEPARTMENT_LABELS[report.spot_department.trim()] ?? ''}
          </span>
        )}
      </div>
      {report.details && <p className="text-[12px] italic text-ink-500">{report.details}</p>}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {report.target_type === 'spot' ? (
          <>
            {report.spot_slug && (
              <Link
                href={`/spots/${report.spot_slug}`}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-600 transition-colors hover:border-ink-300"
              >
                <MapPin size={13} aria-hidden="true" />
                Ouvrir la fiche
              </Link>
            )}
            <Link
              href={`/moderation?tab=reverify&q=${encodeURIComponent(report.spot_name ?? '')}`}
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-navy-900/30 bg-navy-900/5 px-3 py-1.5 text-[12px] font-semibold text-navy-900 transition-colors hover:bg-navy-900/10"
            >
              <RotateCw size={13} aria-hidden="true" />
              Ouvrir en re-vérif
            </Link>
          </>
        ) : report.target_type === 'post' ? (
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
        <form action={verifySpotAction}>
          <input type="hidden" name="spotId" value={spot.id} />
          <button
            type="submit"
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-navy-900/30 bg-navy-900/5 px-3 py-1.5 text-[12px] font-semibold text-navy-900 transition-colors hover:bg-navy-900/10"
            title="Atteste que la coordonnée a été vérifiée à la main (GPS fixe). Approuve aussi le spot et lui donne le badge « Coordonnée vérifiée »."
          >
            <BadgeCheck size={13} aria-hidden="true" />
            Marquer vérifié
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
// Ligne « Re-vérifier » : un spot (vérifié ou non), avec lien fiche + bouton
// « re-vérifier la coordonnée » (moderateReverifySpot, re-horodate verified_at).
// ---------------------------------------------------------------------------
const SOURCE_LABELS: Record<string, string> = {
  curated: 'Curé',
  community: 'Communauté',
  imported: 'Import',
  osm: 'OSM',
}

function ReverifySpotRow({ spot }: { spot: ReverifySpot }) {
  const dept = spot.department.trim()
  const verifiedDate = spot.verified_at
    ? new Date(spot.verified_at).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-sand-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-navy-900">
            <MapPin size={14} className="text-teal-600" aria-hidden="true" />
            <Link href={`/spots/${spot.slug}`} className="underline-offset-2 hover:underline">
              {spot.name}
            </Link>
          </p>
          <p className="mt-0.5 text-[12px] text-ink-400">
            <span className="font-mono">{dept}</span> {DEPARTMENT_LABELS[dept] ?? ''}
            {' · '}
            {SOURCE_LABELS[spot.source] ?? spot.source}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {spot.verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
              <BadgeCheck size={12} aria-hidden="true" />
              Vérifié{verifiedDate ? ` le ${verifiedDate}` : ''}
            </span>
          ) : (
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-500">
              Non vérifié
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-ink-400">
            {spot.moderation_status}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          href={`/spots/${spot.slug}`}
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-600 transition-colors hover:border-ink-300"
        >
          <MapPin size={13} aria-hidden="true" />
          Ouvrir la fiche
        </Link>
        <form action={reverifySpotAction}>
          <input type="hidden" name="spotId" value={spot.id} />
          <button
            type="submit"
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg border border-navy-900/30 bg-navy-900/5 px-3 py-1.5 text-[12px] font-semibold text-navy-900 transition-colors hover:bg-navy-900/10"
            title="Re-contrôle la coordonnée à la main et rafraîchit la date de vérification (« vérifié le … » repart à aujourd'hui)."
          >
            <RotateCw size={13} aria-hidden="true" />
            Re-vérifier la coordonnée
          </button>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const IMPORTS_PER_PAGE = 25

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    dept?: string
    page?: string
    q?: string
    source?: string
    status?: string
  }>
}) {
  const {
    tab,
    dept: deptParam,
    page: pageParam,
    q: qParam,
    source: sourceParam,
    status: statusParam,
  } = await searchParams
  const activeTab =
    tab === 'spots'
      ? 'spots'
      : tab === 'imports'
        ? 'imports'
        : tab === 'reverify'
          ? 'reverify'
          : 'reports'

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

  // Compteur d'imports OSM à curer (badge d'onglet + progression).
  const { count: pendingImportsCount } = await supabase
    .from('spots')
    .select('id', { count: 'exact', head: true })
    .eq('moderation_status', 'pending')
    .eq('source', 'imported')

  // ---- Données selon l'onglet ----
  let reports: Report[] = []
  let pendingSpots: PendingSpot[] = []
  let imports: ImportToCurate[] = []
  // Re-vérif : liste filtrable (nom/dépt/source/statut) + pagination.
  let reverifySpots: ReverifySpot[] = []
  let reverifyTotal = 0
  const reverifyQuery = (qParam ?? '').trim().slice(0, 80)
  const reverifySource =
    sourceParam && ['curated', 'community', 'imported', 'osm'].includes(sourceParam)
      ? sourceParam
      : null
  const reverifyStatus =
    statusParam && ['pending', 'approved', 'rejected'].includes(statusParam)
      ? statusParam
      : null
  const reverifyDept =
    deptParam && COASTAL_DEPARTMENTS.includes(deptParam) ? deptParam : null
  const reverifyPage = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)
  // Curage : filtre dépt + pagination + progression.
  const selectedDept =
    deptParam && COASTAL_DEPARTMENTS.includes(deptParam) ? deptParam : null
  let importsTotalForFilter = 0
  let curatedTotalCount = 0
  let importsDeptCounts: { department: string; count: number }[] = []
  const importsPage = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1)

  if (activeTab === 'imports') {
    // Total curés depuis le départ (dénominateur de progression).
    const { count: curated } = await supabase
      .from('spots')
      .select('id', { count: 'exact', head: true })
      .eq('source', 'curated')
    curatedTotalCount = curated ?? 0

    // Comptes d'imports pending PAR département (façades maigres d'abord côté UI).
    // PostgREST ne fait pas de GROUP BY → on compte dépt par dépt (24 requêtes
    // légères, count head:true, exécutées en parallèle).
    const deptCountPairs = await Promise.all(
      COASTAL_DEPARTMENTS.map(async (code) => {
        const { count } = await supabase
          .from('spots')
          .select('id', { count: 'exact', head: true })
          .eq('moderation_status', 'pending')
          .eq('source', 'imported')
          .eq('department', code)
        return { department: code, count: count ?? 0 }
      }),
    )
    importsDeptCounts = deptCountPairs.filter((d) => d.count > 0)

    // Liste paginée des imports (filtrée par dépt si demandé).
    let q = supabase
      .from('spots')
      .select('id, name, department, structure, species, techniques, description, access_notes', {
        count: 'exact',
      })
      .eq('moderation_status', 'pending')
      .eq('source', 'imported')
    if (selectedDept) q = q.eq('department', selectedDept)
    const from = (importsPage - 1) * IMPORTS_PER_PAGE
    const { data: rawImports, count: filterCount } = await q
      .order('department', { ascending: true })
      .order('name', { ascending: true })
      .range(from, from + IMPORTS_PER_PAGE - 1)
    importsTotalForFilter = filterCount ?? 0
    imports = (rawImports ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      department: s.department,
      structure: s.structure,
      species: s.species,
      techniques: s.techniques,
      description: s.description,
      access_notes: s.access_notes,
    }))
  } else if (activeTab === 'reports') {
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
    // Contexte des reports target_type='spot' (sprint 48) : nom + slug + dépt
    // pour relier le signalement à la fiche. Aucune coordonnée n'est lue ici.
    const spotIds = [...new Set(rows.filter((r) => r.target_type === 'spot').map((r) => r.target_id))]
    const reportedSpots = new Map<string, { name: string; slug: string; department: string }>()
    if (spotIds.length > 0) {
      const { data } = await supabase.from('spots').select('id, name, slug, department').in('id', spotIds)
      for (const s of data ?? []) reportedSpots.set(s.id, { name: s.name, slug: s.slug, department: s.department })
    }
    reports = rows.map((r) => {
      const post = r.target_type === 'post' ? posts.get(r.target_id) : undefined
      const spot = r.target_type === 'spot' ? reportedSpots.get(r.target_id) : undefined
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
        spot_name: spot?.name ?? null,
        spot_slug: spot?.slug ?? null,
        spot_department: spot?.department ?? null,
      }
    })
  } else if (activeTab === 'spots') {
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
  } else if (activeTab === 'reverify') {
    // Vue « Re-vérifier » : TOUS les spots (au-delà des pending), filtrables.
    // La page entière est déjà modérateur-only (gate is_moderator ci-dessus).
    let q = supabase
      .from('spots')
      .select('id, name, slug, department, source, moderation_status, verified, verified_at, verification_level', {
        count: 'exact',
      })
    if (reverifyQuery) q = q.ilike('name', `%${reverifyQuery}%`)
    if (reverifyDept) q = q.eq('department', reverifyDept)
    if (reverifySource) q = q.eq('source', reverifySource)
    if (reverifyStatus) q = q.eq('moderation_status', reverifyStatus)
    const from = (reverifyPage - 1) * IMPORTS_PER_PAGE
    const { data: rawReverify, count } = await q
      .order('name', { ascending: true })
      .range(from, from + IMPORTS_PER_PAGE - 1)
    reverifyTotal = count ?? 0
    reverifySpots = (rawReverify ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      department: s.department,
      source: s.source,
      moderation_status: s.moderation_status,
      verified: s.verified,
      verified_at: s.verified_at,
      verification_level: s.verification_level,
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
        <Link href="/moderation?tab=imports" className={tabCls(activeTab === 'imports')}>
          Imports à curer
          {(pendingImportsCount ?? 0) > 0 && (
            <span className="ml-1.5 rounded-full bg-navy-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
              {pendingImportsCount}
            </span>
          )}
        </Link>
        <Link href="/moderation?tab=reverify" className={tabCls(activeTab === 'reverify')}>
          Re-vérifier
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
      ) : activeTab === 'spots' ? (
        pendingSpots.length === 0 ? (
          <Empty label="Aucun spot en attente de validation." />
        ) : (
          <div className="flex flex-col gap-3">
            {pendingSpots.map((s) => (
              <PendingSpotRow key={s.id} spot={s} />
            ))}
          </div>
        )
      ) : activeTab === 'reverify' ? (
        <ReverifyTab
          spots={reverifySpots}
          total={reverifyTotal}
          query={reverifyQuery}
          selectedDept={reverifyDept}
          selectedSource={reverifySource}
          selectedStatus={reverifyStatus}
          page={reverifyPage}
          perPage={IMPORTS_PER_PAGE}
        />
      ) : (
        <ImportsTab
          imports={imports}
          selectedDept={selectedDept}
          deptCounts={importsDeptCounts}
          curatedTotal={curatedTotalCount}
          pendingImportsTotal={pendingImportsCount ?? 0}
          filterTotal={importsTotalForFilter}
          page={importsPage}
          perPage={IMPORTS_PER_PAGE}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Onglet « Re-vérifier » : recherche par nom + filtres dépt/source/statut +
// liste paginée de TOUS les spots, chacun re-vérifiable. Modérateur-only (la
// page entière est gardée is_moderator).
// ---------------------------------------------------------------------------
function ReverifyTab({
  spots,
  total,
  query,
  selectedDept,
  selectedSource,
  selectedStatus,
  page,
  perPage,
}: {
  spots: ReverifySpot[]
  total: number
  query: string
  selectedDept: string | null
  selectedSource: string | null
  selectedStatus: string | null
  page: number
  perPage: number
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  // Construit une URL de filtre en préservant les autres paramètres actifs.
  const buildHref = (overrides: Record<string, string | null>) => {
    const params = new URLSearchParams()
    params.set('tab', 'reverify')
    const merged: Record<string, string | null> = {
      q: query || null,
      dept: selectedDept,
      source: selectedSource,
      status: selectedStatus,
      ...overrides,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    return `/moderation?${params.toString()}`
  }
  const filterChip = (label: string, href: string, active: boolean) => (
    <Link
      href={href}
      className={`min-h-[36px] rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? 'border-navy-900 bg-navy-900 text-white'
          : 'border-sand-200 bg-white text-ink-600 hover:border-ink-300'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Recherche par nom (form GET, conserve les filtres en hidden). */}
      <form action="/moderation" method="get" className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tab" value="reverify" />
        {selectedDept && <input type="hidden" name="dept" value={selectedDept} />}
        {selectedSource && <input type="hidden" name="source" value={selectedSource} />}
        {selectedStatus && <input type="hidden" name="status" value={selectedStatus} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Chercher un spot par nom"
          className="min-h-[44px] flex-1 rounded-full border border-sand-200 bg-white px-4 py-2 text-[13px] text-ink-700 placeholder:text-ink-400 focus:border-navy-900 focus:outline-none"
        />
        <button
          type="submit"
          className="min-h-[44px] rounded-full border border-navy-900 bg-navy-900 px-4 py-2 text-[13px] font-semibold text-white"
        >
          Chercher
        </button>
      </form>

      {/* Filtres source + statut. */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-400">
            Source
          </span>
          {filterChip('Toutes', buildHref({ source: null, page: null }), selectedSource === null)}
          {(['curated', 'community', 'imported', 'osm'] as const).map((src) =>
            filterChip(
              SOURCE_LABELS[src] ?? src,
              buildHref({ source: src, page: null }),
              selectedSource === src,
            ),
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-400">
            Statut
          </span>
          {filterChip('Tous', buildHref({ status: null, page: null }), selectedStatus === null)}
          {(['pending', 'approved', 'rejected'] as const).map((st) =>
            filterChip(st, buildHref({ status: st, page: null }), selectedStatus === st),
          )}
        </div>
      </div>

      <p className="font-mono text-[12px] text-ink-400">{total} spot(s)</p>

      {/* Liste */}
      {spots.length === 0 ? (
        <Empty label="Aucun spot ne correspond à ces filtres." />
      ) : (
        <div className="flex flex-col gap-3">
          {spots.map((s) => (
            <ReverifySpotRow key={s.id} spot={s} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Link
              href={buildHref({ page: String(page - 1) })}
              className="min-h-[44px] rounded-full border border-sand-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-600 hover:border-ink-300"
            >
              Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-[12px] text-ink-400">
            page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={buildHref({ page: String(page + 1) })}
              className="min-h-[44px] rounded-full border border-sand-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-600 hover:border-ink-300"
            >
              Suivant
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Onglet « Imports à curer » : progression + filtre dépt + liste paginée.
// ---------------------------------------------------------------------------
function ImportsTab({
  imports,
  selectedDept,
  deptCounts,
  curatedTotal,
  pendingImportsTotal,
  filterTotal,
  page,
  perPage,
}: {
  imports: ImportToCurate[]
  selectedDept: string | null
  deptCounts: { department: string; count: number }[]
  curatedTotal: number
  pendingImportsTotal: number
  filterTotal: number
  page: number
  perPage: number
}) {
  const grandTotal = curatedTotal + pendingImportsTotal
  const pct = grandTotal > 0 ? Math.round((curatedTotal / grandTotal) * 100) : 0
  const totalPages = Math.max(1, Math.ceil(filterTotal / perPage))
  const deptHref = (code: string | null) =>
    `/moderation?tab=imports${code ? `&dept=${code}` : ''}`
  const pageHref = (p: number) =>
    `/moderation?tab=imports${selectedDept ? `&dept=${selectedDept}` : ''}&page=${p}`
  // Façades maigres d'abord (D2) : tri par nombre d'imports croissant.
  const sortedDepts = [...deptCounts].sort(
    (a, b) => a.count - b.count || a.department.localeCompare(b.department),
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Progression */}
      <div className="rounded-[14px] border border-sand-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-navy-900">
            <Anchor size={15} className="text-navy-900" aria-hidden="true" />
            Curage des spots importés
          </span>
          <span className="font-mono text-[13px] text-ink-600">
            <span className="font-semibold text-teal-700">{curatedTotal}</span> curés ·{' '}
            <span className="font-semibold text-navy-900">{pendingImportsTotal}</span> restants
          </span>
        </div>
        <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
          <div
            className="h-full rounded-full bg-teal-500"
            style={{ width: `${pct}%` }}
            aria-hidden="true"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-ink-400">
          {pct}% du catalogue est curé. Chaque import validé passe « vérifié » et apparaît sur la carte.
        </p>
      </div>

      {/* Filtre par département (façades maigres en tête) */}
      {deptCounts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={deptHref(null)}
            className={`min-h-[36px] rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              selectedDept === null
                ? 'border-navy-900 bg-navy-900 text-white'
                : 'border-sand-200 bg-white text-ink-600 hover:border-ink-300'
            }`}
          >
            Tous
          </Link>
          {sortedDepts.map((d) => {
            const code = d.department.trim()
            const on = selectedDept === code
            return (
              <Link
                key={code}
                href={deptHref(code)}
                className={`min-h-[36px] rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                  on
                    ? 'border-navy-900 bg-navy-900 text-white'
                    : 'border-sand-200 bg-white text-ink-600 hover:border-ink-300'
                }`}
              >
                <span className="font-mono">{code}</span> {DEPARTMENT_LABELS[code] ?? ''}
                <span className={`ml-1.5 font-mono ${on ? 'text-white/80' : 'text-ink-400'}`}>{d.count}</span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Liste à curer */}
      <ImportsCurationList imports={imports} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="min-h-[44px] rounded-full border border-sand-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-600 hover:border-ink-300"
            >
              Précédent
            </Link>
          ) : (
            <span />
          )}
          <span className="font-mono text-[12px] text-ink-400">
            page {page} / {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="min-h-[44px] rounded-full border border-sand-200 bg-white px-4 py-2 text-[13px] font-semibold text-ink-600 hover:border-ink-300"
            >
              Suivant
            </Link>
          ) : (
            <span />
          )}
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
