'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Flag, Check, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  reportSpotCoordinate,
  confirmSpot,
  unconfirmSpot,
} from '@/app/actions/spots'
import type { SpotReportReason } from '@/lib/spots/report-reasons'

// Raisons orientées coordonnée (D1, sprint 48). Le type vient de l'action serveur
// (source de vérité : validation zod + RLS). Aucune coordonnée n'est jamais transmise
// ici, uniquement un motif + une précision libre.
const REASONS: { value: SpotReportReason; label: string }[] = [
  { value: 'coord_fausse', label: 'La position est fausse' },
  { value: 'acces_change', label: 'L’accès a changé' },
  { value: 'danger_manquant', label: 'Un danger n’est pas signalé' },
  { value: 'autre', label: 'Autre' },
]

export function ReportSpotDialog({
  spotId,
  open,
  onOpenChange,
}: {
  spotId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState<SpotReportReason>('coord_fausse')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    setSubmitting(true)
    const res = await reportSpotCoordinate(spotId, reason, details.trim() || undefined)
    setSubmitting(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success('Merci, on regarde la position.')
    setDetails('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Signaler une erreur de position</DialogTitle>
          <DialogDescription>
            Tu as repéré un souci sur ce point ? Dis-nous quoi, un modérateur ira
            re-vérifier la coordonnée.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={reason}
          onValueChange={(v) => setReason(v as SpotReportReason)}
          className="flex flex-col gap-2.5 py-2"
        >
          {REASONS.map((r) => (
            <Label
              key={r.value}
              className="flex items-center gap-2.5 text-[14px] text-ink-700 cursor-pointer min-h-11"
            >
              <RadioGroupItem value={r.value} />
              {r.label}
            </Label>
          ))}
        </RadioGroup>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Précise (optionnel)…"
          className="w-full rounded-[14px] border border-ink-200 p-3 text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/40"
        />

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-teal-500 hover:bg-teal-600">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Signaler
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Bouton « Signaler une erreur de position » + dialog associé. Client wrapper léger
 * porté sur la fiche spot (Server Component) près de l'encart vérifié. Réservé aux
 * connectés : si `loginHref` est fourni (visiteur anonyme), le bouton renvoie vers la
 * connexion plutôt que d'ouvrir le dialog (l'action serveur refuse de toute façon).
 */
export function SpotReportButton({
  spotId,
  loginHref,
}: {
  spotId: string
  loginHref?: string
}) {
  const [open, setOpen] = useState(false)

  if (loginHref) {
    return (
      <Link
        href={loginHref}
        className="flex items-center justify-center gap-1.5 w-full min-h-11 rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-600 transition-colors hover:border-coral-300 hover:text-coral-600"
      >
        <Flag size={14} aria-hidden="true" />
        Signaler une erreur de position
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 w-full min-h-11 rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-600 transition-colors hover:border-coral-300 hover:text-coral-600"
      >
        <Flag size={14} aria-hidden="true" />
        Signaler une erreur de position
      </button>
      <ReportSpotDialog spotId={spotId} open={open} onOpenChange={setOpen} />
    </>
  )
}

/**
 * Compteur de confirmations communautaires « K pêcheurs confirment cette position »
 * + bouton « Je confirme » / « Tu confirmes » (D2, sprint 48). Descriptif, jamais un
 * classement : aucune identité, juste un nombre (la RPC get_spot_confirmation_count ne
 * renvoie qu'un entier). Le compteur s'affiche optimiste localement puis se resync via
 * router.refresh(). Aucune coordonnée n'est manipulée ici.
 *
 * - `loginHref` (visiteur anonyme) → CTA de connexion, pas de bouton de confirmation.
 * - `initialConfirmed` = l'utilisateur courant a-t-il déjà confirmé (lecture RLS own).
 */
export function SpotConfirmButton({
  spotId,
  initialCount,
  initialConfirmed,
  loginHref,
}: {
  spotId: string
  initialCount: number
  initialConfirmed: boolean
  loginHref?: string
}) {
  const router = useRouter()
  const [count, setCount] = useState(initialCount)
  const [confirmed, setConfirmed] = useState(initialConfirmed)
  const [pending, startTransition] = useTransition()

  function toggle() {
    if (pending) return
    const wasConfirmed = confirmed
    // Optimiste : bascule l'état + ajuste le compteur (jamais sous 0).
    setConfirmed(!wasConfirmed)
    setCount((c) => Math.max(0, c + (wasConfirmed ? -1 : 1)))

    startTransition(async () => {
      const res = wasConfirmed
        ? await unconfirmSpot(spotId)
        : await confirmSpot(spotId)
      if (!res.ok) {
        // Rollback en cas d'échec.
        setConfirmed(wasConfirmed)
        setCount((c) => Math.max(0, c + (wasConfirmed ? 1 : -1)))
        toast.error(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-3 border-t border-teal-500/15 pt-3">
      <p className="flex items-center gap-1.5 text-[13px] text-ink-600">
        <MapPin size={14} className="text-teal-600 shrink-0" aria-hidden="true" />
        {count > 0 ? (
          <span>
            <span className="font-mono font-medium text-navy-900">{count}</span>{' '}
            pêcheur{count > 1 ? 's' : ''} confirme{count > 1 ? 'nt' : ''} cette position
          </span>
        ) : (
          <span>Personne n’a encore confirmé cette position</span>
        )}
      </p>

      {loginHref ? (
        <Link
          href={loginHref}
          className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-teal-700 hover:text-teal-800"
        >
          Connecte-toi pour confirmer
        </Link>
      ) : (
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-pressed={confirmed ? 'true' : 'false'}
          className={
            confirmed
              ? 'mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[13px] font-semibold text-teal-800 transition-colors hover:bg-teal-500/15 disabled:opacity-60'
              : 'mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-ink-700 transition-colors hover:border-teal-400 hover:text-teal-700 disabled:opacity-60'
          }
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <Check size={14} aria-hidden="true" />
          )}
          {confirmed ? 'Tu confirmes' : 'Je confirme cette position'}
        </button>
      )}
    </div>
  )
}
