'use client'

import { useState } from 'react'
import { Loader2, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createOutingReview } from '@/lib/cofishing/actions'

export type ReviewableMember = {
  user_id: string
  username: string | null
  display_name: string | null
}

function memberName(m: ReviewableMember): string {
  return m.display_name || (m.username ? `@${m.username}` : 'Pêcheur')
}

/**
 * Noter une sortie passée. Descriptif (zéro classement compétitif) : on partage un
 * ressenti sur les autres pêcheurs de la sortie (ponctualité, ambiance, partage), pas
 * un palmarès. Une note 1-5 + un commentaire libre (≤500) par autre membre. La RLS
 * (087) n'accepte l'avis que d'un membre d'une sortie PASSÉE sur un AUTRE membre.
 *
 * `members` = les autres membres notables (l'hôte et/ou les acceptés, sans soi-même).
 */
export function OutingReviewDialog({
  proposalId,
  members,
  open,
  onOpenChange,
}: {
  proposalId: string
  members: ReviewableMember[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  // Une note + un commentaire par membre noté. On envoie un avis par membre renseigné.
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    const toSend = members.filter((m) => (ratings[m.user_id] ?? 0) >= 1)
    if (toSend.length === 0) {
      toast.error('Mets au moins une note pour valider ton avis.')
      return
    }

    setSubmitting(true)
    let okCount = 0
    let firstError: string | null = null
    for (const m of toSend) {
      const res = await createOutingReview(
        proposalId,
        m.user_id,
        ratings[m.user_id],
        comments[m.user_id]?.trim() || undefined,
      )
      if ('error' in res) {
        if (!firstError) firstError = res.error
      } else {
        okCount += 1
      }
    }
    setSubmitting(false)

    if (okCount === 0) {
      toast.error(firstError ?? 'Impossible d’enregistrer ton avis.')
      return
    }
    toast.success(
      okCount > 1 ? 'Merci, tes avis sont enregistrés.' : 'Merci, ton avis est enregistré.',
    )
    setRatings({})
    setComments({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>Noter cette sortie</DialogTitle>
          <DialogDescription>
            Partage ton ressenti sur les pêcheurs de la sortie (ponctualité, ambiance, partage).
            C’est descriptif et public, pas un classement.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {members.map((m) => {
            const value = ratings[m.user_id] ?? 0
            return (
              <div key={m.user_id} className="flex flex-col gap-2">
                <p className="text-[14px] font-semibold text-navy-900">{memberName(m)}</p>
                <div className="flex items-center gap-1" role="group" aria-label={`Note pour ${memberName(m)}`}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const filled = n <= value
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} sur 5`}
                        aria-pressed={n === value}
                        onClick={() => setRatings((prev) => ({ ...prev, [m.user_id]: n }))}
                        className="flex size-9 items-center justify-center rounded-full transition-colors hover:bg-sand-100"
                      >
                        <Star
                          size={20}
                          className={filled ? 'fill-gold-500 text-gold-500' : 'text-ink-300'}
                          aria-hidden
                        />
                      </button>
                    )
                  })}
                  {value > 0 && (
                    <span className="ml-1 font-mono text-[12px] text-ink-500">{value}/5</span>
                  )}
                </div>
                <textarea
                  value={comments[m.user_id] ?? ''}
                  onChange={(e) =>
                    setComments((prev) => ({ ...prev, [m.user_id]: e.target.value }))
                  }
                  maxLength={500}
                  rows={2}
                  placeholder="Un mot sur la sortie (optionnel)…"
                  className="w-full resize-none rounded-[12px] border border-sand-200 p-2.5 text-[13px] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/40"
                />
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-teal-500 hover:bg-teal-600">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Envoyer mon avis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
