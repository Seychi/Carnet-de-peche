'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { createClient } from '@/lib/supabase/client'
import { parseOutingSummary, type OutingSummary } from '@/lib/outings/summary'
import { PostComposer, type ComposerUser } from '@/components/feed/PostComposer'

// ─── Dialog « Raconte ta sortie » (Sprint 73, solo) ───────────────────────────
// Hôte du PostComposer en mode sortie. Ouvert depuis le CTA d'une sortie clôturée
// (TellOutingButton) ou après un regroupement de prises (RegroupCatchesCard).
//
// Le résumé est chargé via get_outing_summary sous la SESSION du propriétaire (le
// viewer = l'auteur de la sortie) : per-viewer et geom-free (la RPC ne renvoie AUCUNE
// coordonnée, la zone = département). La région du post = le département de la sortie.
// Le résumé faisant AUTORITÉ sur le post publié est recalculé côté serveur par
// getFeedPage ; ici c'est un aperçu pour l'auteur, avant publication.

export function OutingPostComposerDialog({
  outingId,
  open,
  onOpenChange,
  currentUser,
  onPublished,
}: {
  outingId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: ComposerUser
  onPublished?: () => void
}) {
  const [summary, setSummary] = useState<OutingSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charge le résumé à l'ouverture (ou au changement de sortie). On ne garde pas de
  // cache entre sorties : chaque ouverture recharge la sortie ciblée.
  useEffect(() => {
    if (!open || !outingId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setSummary(null)
    const supabase = createClient()
    supabase
      .rpc('get_outing_summary', { p_outing_id: outingId })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return
        if (rpcError) {
          console.error('[OutingPostComposerDialog] summary', rpcError.message)
          setError('Impossible de charger le résumé de ta sortie. Réessaie.')
          setLoading(false)
          return
        }
        const parsed = parseOutingSummary(data)
        if (!parsed) {
          setError('Cette sortie est introuvable.')
          setLoading(false)
          return
        }
        setSummary(parsed)
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, outingId])

  const region = summary?.department ?? null

  function handlePublished() {
    onOpenChange(false)
    onPublished?.()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="bg-sand-50">
        <SheetHeader>
          <SheetTitle>Raconte ta sortie</SheetTitle>
          <SheetDescription>
            Un récit de sortie, sans jamais montrer tes spots : la zone reste ton département.
          </SheetDescription>
        </SheetHeader>

        <div className="max-h-[70vh] overflow-y-auto px-4 pb-6">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-ink-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-[14px]">Chargement du résumé…</span>
            </div>
          )}

          {!loading && error && (
            <p className="py-8 text-center text-[14px] text-ink-600">{error}</p>
          )}

          {!loading && !error && summary && !region && (
            <p className="py-8 text-center text-[14px] text-ink-600">
              Le département de cette sortie n&rsquo;est pas déterminé : impossible de publier
              le récit. Renseigne ton département d&rsquo;attache dans ton profil.
            </p>
          )}

          {!loading && !error && summary && region && outingId && (
            <PostComposer
              region={region}
              currentUser={currentUser}
              outing={{ id: outingId, summary }}
              onPublished={handlePublished}
              autoFocus
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
