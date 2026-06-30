import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Clock, CheckCircle2, XCircle, MapPinPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { STRUCTURE_LABELS } from '@/lib/labels'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

export const metadata = { title: 'Mes propositions de spots — Carnet de Pêche' }
export const dynamic = 'force-dynamic'

type ProposalRow = {
  id: string
  name: string
  slug: string
  department: string
  structure: string | null
  moderation_status: string
  created_at: string
}

// Badge d'état — info portée par le LABEL + l'ICÔNE (pas seulement la couleur :
// daltonisme). cf docs CLAUDE.md.
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; icon: typeof Clock; cls: string }> = {
    pending: { label: 'En attente', icon: Clock, cls: 'border-gold-500/40 bg-gold-500/10 text-ink-700' },
    approved: { label: 'Validé', icon: CheckCircle2, cls: 'border-teal-500/40 bg-teal-500/10 text-teal-700' },
    rejected: { label: 'Refusé', icon: XCircle, cls: 'border-coral-500/40 bg-coral-500/10 text-coral-600' },
  }
  const s = map[status] ?? map.pending
  const Icon = s.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-mono font-semibold uppercase tracking-[0.05em] ${s.cls}`}
    >
      <Icon size={12} aria-hidden="true" />
      {s.label}
    </span>
  )
}

export default async function MyProposalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?redirect=/spots/mes-propositions')

  // RLS : l'auteur voit ses propres spots quel que soit le moderation_status.
  const { data, error } = await supabase
    .from('spots')
    .select('id, name, slug, department, structure, moderation_status, created_at')
    .eq('created_by', user.id)
    .eq('source', 'community')
    .order('created_at', { ascending: false })

  if (error) console.error('[mes-propositions]', error.message)
  const proposals = (data ?? []) as ProposalRow[]

  return (
    <div className="mx-auto max-w-[640px] px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-navy-900">Mes propositions</h1>
          <p className="mt-1 text-[13px] text-ink-500">
            {proposals.length === 0
              ? 'Tu n’as pas encore proposé de spot.'
              : `${proposals.length} proposition${proposals.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/spots/proposer"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-navy-900 px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          <MapPinPlus size={15} aria-hidden="true" />
          Proposer
        </Link>
      </div>

      {proposals.length === 0 ? (
        <div className="rounded-[14px] border border-sand-200 bg-white px-6 py-12 text-center">
          <MapPinPlus size={30} className="mx-auto mb-3 text-ink-200" aria-hidden="true" />
          <p className="text-[14px] text-ink-400">
            Repère un bon coin public ?{' '}
            <Link href="/spots/proposer" className="font-medium text-teal-700 underline">
              Propose-le
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {proposals.map((p) => {
            const dept = p.department.trim()
            const approved = p.moderation_status === 'approved'
            return (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-sand-200 bg-white p-4"
              >
                <div className="min-w-0">
                  {approved ? (
                    <Link href={`/spots/${p.slug}`} className="block truncate text-[15px] font-semibold text-navy-900 hover:underline">
                      {p.name}
                    </Link>
                  ) : (
                    <span className="block truncate text-[15px] font-semibold text-navy-900">{p.name}</span>
                  )}
                  <p className="mt-0.5 truncate text-[12px] text-ink-400">
                    {p.structure ? STRUCTURE_LABELS[p.structure] ?? p.structure : '—'}
                    {' · '}
                    <span className="font-mono">{dept}</span> {DEPARTMENT_LABELS[dept] ?? ''}
                  </p>
                </div>
                <StatusBadge status={p.moderation_status} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
