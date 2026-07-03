'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BadgeCheck, MessageSquarePlus } from 'lucide-react'
import { OutingPostComposerDialog } from './OutingPostComposerDialog'
import type { ComposerUser } from '@/components/feed/PostComposer'

// ─── CTA « Raconte cette sortie » (Sprint 73, solo) ──────────────────────────
// Placé sur une sortie clôturée (ended_at renseigné). Si un récit est déjà publié
// (postId non null), on affiche un état neutre « Récit publié » (au plus 1 post par
// sortie, garanti par l'index unique partiel). Sinon, un bouton ouvre le composer
// pré-rempli avec la sortie.

export function TellOutingButton({
  outingId,
  postId,
  currentUser,
}: {
  outingId: string
  postId: string | null
  currentUser: ComposerUser
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (postId) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-teal-700">
        <BadgeCheck size={15} aria-hidden="true" />
        Récit publié
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-teal-500/50 px-4 text-[13.5px] font-semibold text-teal-700 transition-colors hover:bg-teal-50"
      >
        <MessageSquarePlus size={15} aria-hidden="true" />
        Raconte cette sortie
      </button>

      <OutingPostComposerDialog
        outingId={open ? outingId : null}
        open={open}
        onOpenChange={setOpen}
        currentUser={currentUser}
        onPublished={() => router.refresh()}
      />
    </>
  )
}
