'use client'

import { useState } from 'react'
import { Share2 } from 'lucide-react'
import type { ShareCardInput } from '@/app/actions/share'
import { useShareCard } from './use-share-card'
import { ShareOptInDialog } from './ShareOptInDialog'

// Bouton de partage réutilisable (sprint 38 WS-C). Opt-in strict : clic → dialog
// d'avertissement (carte publique, sans coordonnées) → création + Web Share. Sert
// pour les conditions (cockpit/carnet) et une sortie. La prise a son propre point
// d'entrée dans le menu « ⋯ » de la fiche (CatchActionsDropdown).

type Variant = 'solid' | 'ghost' | 'card'

const VARIANT_CLS: Record<Variant, string> = {
  solid:
    'bg-navy-900 text-white hover:bg-navy-800 px-4 text-[14px] font-semibold',
  ghost:
    'border border-sand-300 bg-white text-ink-700 hover:border-teal-500/50 px-4 text-[14px] font-semibold',
  card:
    'w-full border border-sand-200 bg-white text-navy-900 hover:border-teal-400 px-4 text-[14px] font-semibold justify-between',
}

export function ShareButton({
  input,
  title,
  text,
  label = 'Partager',
  variant = 'ghost',
  className,
}: {
  input: ShareCardInput
  title: string
  text: string
  label?: string
  variant?: Variant
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const { share, sharing } = useShareCard()

  async function handleConfirm() {
    await share(input, title, text)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full transition-colors disabled:opacity-60 ${VARIANT_CLS[variant]} ${className ?? ''}`}
      >
        <Share2 size={15} aria-hidden="true" />
        {label}
      </button>

      <ShareOptInDialog
        kind={input.kind}
        open={open}
        onOpenChange={(v) => {
          if (!sharing) setOpen(v)
        }}
        onConfirm={handleConfirm}
        working={sharing}
      />
    </>
  )
}
