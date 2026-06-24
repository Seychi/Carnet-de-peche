'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { MapPin, Users, Check, X, Calendar } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { requestJoin, withdrawJoin, respondToParticipant, cancelOuting } from '@/lib/cofishing/actions'
import type { OutingProposalView, ParticipantWithProfile } from '@/lib/cofishing/queries'
import { DEPARTMENT_LABELS } from '@/lib/geo/departments'

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function name(p: { display_name: string | null; username: string | null }): string {
  return p.display_name || (p.username ? `@${p.username}` : 'Pêcheur')
}

export function ProposalCard({
  proposal: p,
  viewerId,
  participationStatus,
  participants,
}: {
  proposal: OutingProposalView
  viewerId: string
  participationStatus?: string
  participants?: ParticipantWithProfile[]
}) {
  const isHost = p.host_id === viewerId
  const [pending, start] = useTransition()
  const [status, setStatus] = useState(participationStatus)

  function run(fn: () => Promise<{ ok: true } | { error: string }>, onOk?: () => void) {
    start(async () => {
      const res = await fn()
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      onOk?.()
    })
  }

  const requests = (participants ?? []).filter((x) => x.status === 'requested')
  const accepted = (participants ?? []).filter((x) => x.status === 'accepted')

  return (
    <div className="rounded-[14px] border border-sand-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar className="size-9 shrink-0">
            {p.host_avatar_url && <AvatarImage src={p.host_avatar_url} alt="" />}
            <AvatarFallback className="text-[11px]">
              {name({ display_name: p.host_display_name, username: p.host_username }).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-navy-900 truncate">
              {name({ display_name: p.host_display_name, username: p.host_username })}
              {isHost && <span className="ml-1.5 text-[11px] font-normal text-teal-600">· tu organises</span>}
            </p>
            <p className="flex items-center gap-1 text-[12px] text-ink-500">
              <Calendar size={11} /> {fmt(p.planned_at)}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
          Dép. {p.department}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-[13px] text-ink-700">
        {p.area_label && (
          <p className="flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-ink-400" /> {p.area_label}
            <span className="text-ink-400">· {DEPARTMENT_LABELS[p.department] ?? ''}</span>
          </p>
        )}
        <p className="flex items-center gap-1.5 text-ink-500">
          <Users size={13} className="shrink-0" />
          {p.accepted_count} participant{p.accepted_count > 1 ? 's' : ''}
          {p.capacity ? ` / ${p.capacity} places` : ''}
        </p>
        {p.notes && <p className="text-ink-600">{p.notes}</p>}
      </div>

      {/* Contrôles hôte : demandes en attente + acceptés */}
      {isHost ? (
        <div className="mt-3 border-t border-sand-100 pt-3">
          {requests.length === 0 && accepted.length === 0 && (
            <p className="text-[12px] text-ink-400">Aucune demande pour l’instant.</p>
          )}
          {requests.map((r) => (
            <div key={r.user_id} className="flex items-center justify-between gap-2 py-1.5">
              <span className="text-[13px] text-ink-700 truncate">{name(r)}</span>
              <div className="flex gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => respondToParticipant(p.id, r.user_id, true), () => toast.success('Participant accepté'))}
                  className="flex items-center gap-1 rounded-full bg-teal-500 px-2.5 py-1 text-[12px] font-medium text-navy-950 disabled:opacity-60"
                >
                  <Check size={12} /> Accepter
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => respondToParticipant(p.id, r.user_id, false))}
                  className="flex items-center gap-1 rounded-full border border-sand-200 px-2.5 py-1 text-[12px] text-ink-600 disabled:opacity-60"
                >
                  <X size={12} /> Refuser
                </button>
              </div>
            </div>
          ))}
          {accepted.length > 0 && (
            <p className="mt-1 text-[12px] text-ink-500">
              Acceptés : {accepted.map((a) => name(a)).join(', ')}
            </p>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => cancelOuting(p.id), () => toast.success('Sortie annulée'))}
            className="mt-2 text-[12px] text-coral-500 hover:underline disabled:opacity-60"
          >
            Annuler la sortie
          </button>
        </div>
      ) : (
        <div className="mt-3 border-t border-sand-100 pt-3">
          {!status && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => requestJoin(p.id), () => { setStatus('requested'); toast.success('Demande envoyée') })}
              className="w-full rounded-[10px] bg-teal-500 py-2.5 text-[13px] font-semibold text-navy-950 transition-colors hover:bg-teal-300 disabled:opacity-60"
            >
              Demander à rejoindre
            </button>
          )}
          {status === 'requested' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-amber-700">Demande envoyée</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => withdrawJoin(p.id), () => { setStatus(undefined); toast.success('Demande retirée') })}
                className="text-[12px] text-ink-500 hover:underline disabled:opacity-60"
              >
                Retirer
              </button>
            </div>
          )}
          {status === 'accepted' && (
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-[13px] font-semibold text-teal-700">
                <Check size={14} /> Tu participes
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => withdrawJoin(p.id), () => { setStatus(undefined); toast.success('Tu t’es retiré') })}
                className="text-[12px] text-ink-500 hover:underline disabled:opacity-60"
              >
                Se retirer
              </button>
            </div>
          )}
          {status === 'declined' && (
            <span className="text-[13px] text-ink-400">Demande non retenue.</span>
          )}
        </div>
      )}
    </div>
  )
}
